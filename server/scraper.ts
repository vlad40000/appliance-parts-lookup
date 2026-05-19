import * as cheerio from 'cheerio';
import { storagePut } from './storage';

export interface DiagramData {
  sectionName: string;
  sectionOrder: number;
  diagramImageUrl: string;
  dlPartsSectionId: string;
}

export interface PartData {
  itemNumber?: string;
  partNumber: string;
  description?: string;
  price?: string;
  availability?: string;
}

export interface ModelLookupResult {
  modelNumber: string;
  dlPartsLookupId: string;
  diagrams: DiagramData[];
  parts: { [sectionId: string]: PartData[] };
}

/**
 * Fetch model lookup page from dlpartscolookup.com
 * Extracts model ID from search results
 */
export async function lookupModelNumber(modelNumber: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.dlpartscolookup.com/lookup`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(modelNumber)}`,
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for the model link in search results
    let modelId: string | null = null;
    $('a[href*="/lookup/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('site=prod-standard')) {
        const match = href.match(/\/lookup\/(\d+)/);
        if (match) {
          modelId = match[1];
          return false; // break
        }
      }
    });

    return modelId;
  } catch (error) {
    console.error('[Scraper] Error looking up model:', error);
    return null;
  }
}

/**
 * Fetch full model data including diagrams and parts
 */
export async function fetchModelData(modelId: string): Promise<ModelLookupResult | null> {
  try {
    const modelUrl = `https://www.dlpartscolookup.com/lookup/${modelId}?site=prod-standard`;
    const response = await fetch(modelUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract model number from page title
    const pageTitle = $('title').text();
    const modelMatch = pageTitle.match(/([A-Z0-9]+)\s+Parts/i);
    const modelNumber = modelMatch ? modelMatch[1] : 'Unknown';

    // Extract diagram sections
    const diagrams: DiagramData[] = [];
    const processedSections = new Set<string>();
    let sectionOrder = 0;

    $('a[href*="/lookup/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      
      // Check if this is a section link
      if (!href.includes('site=prod-standard')) return;
      
      const sectionMatch = href.match(/\/lookup\/\d+\/(\d+)/);
      if (!sectionMatch) return;
      
      const dlPartsSectionId = sectionMatch[1];
      if (processedSections.has(dlPartsSectionId)) return;
      
      processedSections.add(dlPartsSectionId);
      
      const sectionName = $el.text().trim();
      const img = $el.find('img').first();
      const diagramImageUrl = img.attr('src') || '';

      if (sectionName && diagramImageUrl) {
        diagrams.push({
          sectionName,
          sectionOrder: sectionOrder++,
          diagramImageUrl,
          dlPartsSectionId,
        });
      }
    });

    // Extract parts from table for each diagram section
    const parts: { [sectionId: string]: PartData[] } = {};
    
    if (diagrams.length > 0) {
      await Promise.all(
        diagrams.map(async (diagram) => {
          try {
            const sectionData = await fetchDiagramSection(modelId, diagram.dlPartsSectionId);
            if (sectionData) {
              parts[diagram.dlPartsSectionId] = sectionData.parts;
            } else {
              parts[diagram.dlPartsSectionId] = [];
            }
          } catch (err) {
            console.error(`[Scraper] Error fetching section ${diagram.dlPartsSectionId}:`, err);
            parts[diagram.dlPartsSectionId] = [];
          }
        })
      );
    } else {
      const defaultSectionId = 'default';
      parts[defaultSectionId] = [];

      $('table tbody tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length >= 2) {
          const itemNumber = cells.eq(0).text().trim();
          const partNumber = cells.eq(1).text().trim();
          const description = cells.eq(2)?.text().trim() || '';
          const price = cells.eq(3)?.text().trim() || '';
          const availability = cells.eq(4)?.text().trim() || '';

          if (partNumber) {
            parts[defaultSectionId].push({
              itemNumber: itemNumber || undefined,
              partNumber,
              description: description || undefined,
              price: price || undefined,
              availability: availability || undefined,
            });
          }
        }
      });
    }

    return {
      modelNumber,
      dlPartsLookupId: modelId,
      diagrams,
      parts,
    };
  } catch (error) {
    console.error('[Scraper] Error fetching model data:', error);
    return null;
  }
}

/**
 * Fetch a specific diagram section with parts
 */
export async function fetchDiagramSection(
  modelId: string,
  sectionId: string
): Promise<{ diagram: DiagramData; parts: PartData[] } | null> {
  try {
    const sectionUrl = `https://www.dlpartscolookup.com/lookup/${modelId}/${sectionId}?site=prod-standard`;
    const response = await fetch(sectionUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract section name from heading
    let sectionName = 'Parts';
    const heading = $('h2, h3').first().text().trim();
    if (heading) sectionName = heading;

    // Extract diagram image
    let diagramImageUrl = '';
    $('img[src*="/diagram/"]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && (src.includes('/350/') || src.includes('/500/'))) {
        diagramImageUrl = src;
        return false; // break
      }
    });

    const diagram: DiagramData = {
      sectionName,
      sectionOrder: 0,
      diagramImageUrl,
      dlPartsSectionId: sectionId,
    };

    // Extract parts from table
    const parts: PartData[] = [];
    $('table tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length >= 2) {
        const itemNumber = cells.eq(0).text().trim();
        const partNumber = cells.eq(1).text().trim();
        const description = cells.eq(2)?.text().trim() || '';
        const price = cells.eq(3)?.text().trim() || '';
        const availability = cells.eq(4)?.text().trim() || '';

        if (partNumber) {
          parts.push({
            itemNumber: itemNumber || undefined,
            partNumber,
            description: description || undefined,
            price: price || undefined,
            availability: availability || undefined,
          });
        }
      }
    });

    return { diagram, parts };
  } catch (error) {
    console.error('[Scraper] Error fetching diagram section:', error);
    return null;
  }
}

/**
 * Download and cache a diagram image to S3
 */
export async function cacheDiagramImage(
  imageUrl: string,
  modelNumber: string,
  sectionName: string
): Promise<string | null> {
  try {
    // Ensure URL is absolute
    const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `https://www.dlpartscolookup.com${imageUrl}`;
    
    const response = await fetch(absoluteUrl);
    if (!response.ok) return null;
    
    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/png';
    
    // Generate cache key
    const sanitizedModel = modelNumber.replace(/[^A-Z0-9]/gi, '_');
    const sanitizedSection = sectionName.replace(/[^A-Za-z0-9]/g, '_').substring(0, 30);
    const cacheKey = `diagrams/${sanitizedModel}/${sanitizedSection}.png`;
    
    const { url } = await storagePut(cacheKey, new Uint8Array(buffer), mimeType);
    return url;
  } catch (error) {
    console.error('[Scraper] Error caching diagram image:', error);
    return null;
  }
}
