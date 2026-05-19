import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { lookupModelNumber, fetchModelData, cacheDiagramImage } from "./scraper";
import { extractModelNumberFromImage, isValidModelNumber } from "./ocr";
import { getOrCreateModel, getDiagramsAndParts, addSearchHistory, getSearchHistory } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  parts: router({
    lookup: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "modelNumber" in val) {
          return { modelNumber: String((val as Record<string, unknown>).modelNumber) };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const modelNumber = input.modelNumber.trim().toUpperCase();
        
        if (!isValidModelNumber(modelNumber)) {
          return { error: "Invalid model number format", diagrams: [], parts: [] };
        }

        try {
          // Look up model ID from dlpartscolookup.com
          const dlPartsLookupId = await lookupModelNumber(modelNumber);
          if (!dlPartsLookupId) {
            return { error: "Model not found", diagrams: [], parts: [] };
          }

          // Fetch model data
          const modelData = await fetchModelData(dlPartsLookupId);
          if (!modelData) {
            return { error: "Failed to fetch model data", diagrams: [], parts: [] };
          }

          // Cache diagram images
          const diagramsWithCachedImages = await Promise.all(
            modelData.diagrams.map(async (diagram) => {
              const cachedUrl = await cacheDiagramImage(
                diagram.diagramImageUrl,
                modelNumber,
                diagram.sectionName
              );
              return {
                ...diagram,
                diagramImageUrl: cachedUrl || diagram.diagramImageUrl,
              };
            })
          );

          return {
            modelNumber: modelData.modelNumber,
            dlPartsLookupId: modelData.dlPartsLookupId,
            diagrams: diagramsWithCachedImages,
            parts: modelData.parts,
          };
        } catch (error) {
          console.error('[Parts] Error looking up model:', error);
          return { error: "An error occurred during lookup", diagrams: [], parts: [] };
        }
      }),

    extractModelFromImage: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "imageBase64" in val) {
          return {
            imageBase64: String((val as Record<string, unknown>).imageBase64),
            mimeType: String((val as Record<string, unknown>).mimeType || "image/jpeg"),
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        try {
          const modelNumber = await extractModelNumberFromImage(
            input.imageBase64,
            input.mimeType
          );

          if (!modelNumber) {
            return { modelNumber: null, error: "Could not extract model number from image" };
          }

          if (!isValidModelNumber(modelNumber)) {
            return { modelNumber: null, error: "Extracted text does not appear to be a valid model number" };
          }

          return { modelNumber, error: null };
        } catch (error) {
          console.error('[Parts] Error extracting model from image:', error);
          return { modelNumber: null, error: "Failed to process image" };
        }
      }),

    getSearchHistory: protectedProcedure.query(async ({ ctx }) => {
      try {
        const history = await getSearchHistory(ctx.user.id, 20);
        return history;
      } catch (error) {
        console.error('[Parts] Error fetching search history:', error);
        return [];
      }
    }),

    addToHistory: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "modelNumber" in val) {
          const obj = val as Record<string, unknown>;
          return {
            modelNumber: String(obj.modelNumber),
            modelId: obj.modelId ? (obj.modelId as number) : undefined,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input, ctx }) => {
        try {
          await addSearchHistory(ctx.user.id, input.modelNumber, input.modelId);
          return { success: true };
        } catch (error) {
          console.error('[Parts] Error adding to history:', error);
          return { success: false };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
