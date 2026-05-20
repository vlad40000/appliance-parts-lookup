import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Camera, Upload, Search, History, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ModelResults from "@/pages/ModelResults";
import { validateImage, fileToBase64, canvasToBase64, getMimeType } from "@/lib/imageUtils";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Failed to process image";
}

export default function Home() {
  const [modelNumber, setModelNumber] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const lookupMutation = trpc.parts.lookup.useQuery(
    { modelNumber: selectedModel || "" },
    { enabled: !!selectedModel }
  );

  const extractImageMutation = trpc.parts.extractModelFromImage.useMutation();
  const historyQuery = trpc.parts.getSearchHistory.useQuery();
  const addToHistoryMutation = trpc.parts.addToHistory.useMutation();

  const handleSearch = async () => {
    if (!modelNumber.trim()) {
      toast.error("Please enter a model number");
      return;
    }
    setIsLoading(true);
    const normalized = modelNumber.trim().toUpperCase();
    setSelectedModel(normalized);
    
    // Add to history (non-blocking)
    addToHistoryMutation.mutate({ modelNumber: normalized, modelId: undefined })
  };

  const processImage = async (file: File) => {
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image");
      return;
    }

    try {
      toast.loading("Processing image...");
      const base64 = await fileToBase64(file);
      const mimeType = getMimeType(file);

      toast.dismiss();
      toast.loading("Extracting model number...");
      const result = await extractImageMutation.mutateAsync({
        imageBase64: base64,
        mimeType,
      });

      toast.dismiss();
      if (result.error) {
        toast.error(result.error);
      } else if (result.modelNumber) {
        setModelNumber(result.modelNumber);
        toast.success(`Model number extracted: ${result.modelNumber}`);
      }
    } catch (error) {
      toast.dismiss();
      console.error("[OCR upload] Failed to process image:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      await processImage(files[0]);
    }
  };

  const handleCameraCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const imageData = canvasToBase64(canvasRef.current);

    if (imageData) {
      try {
        toast.loading("Extracting model number...");
        const result = await extractImageMutation.mutateAsync({
          imageBase64: imageData,
          mimeType: "image/jpeg",
        });

        toast.dismiss();
        if (result.error) {
          toast.error(result.error);
        } else if (result.modelNumber) {
          setModelNumber(result.modelNumber);
          toast.success(`Model number extracted: ${result.modelNumber}`);
          stopCamera();
        }
      } catch (error) {
        toast.dismiss();
        console.error("[OCR camera] Failed to process image:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      const message = "Could not access camera. Please check permissions.";
      setCameraError(message);
      toast.error(message);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (selectedModel && lookupMutation.data) {
      setIsLoading(false);
    }
  }, [lookupMutation.data, selectedModel]);

  // Memoize history to prevent unnecessary re-renders
  const recentSearches = useMemo(() => {
    return historyQuery.data?.slice(0, 5) || [];
  }, [historyQuery.data]);

  if (selectedModel && !lookupMutation.isLoading) {
    return (
      <ModelResults
        data={lookupMutation.data}
        modelNumber={selectedModel}
        onBack={() => {
          setSelectedModel(null);
          setModelNumber("");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">Appliance Parts Lookup</h1>
          <p className="text-lg text-slate-600">Find parts and diagrams for your appliances</p>
        </div>

        <Card className="border-0 shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-t-lg border-b bg-slate-100 p-0">
              <TabsTrigger 
                value="manual" 
                className="rounded-none border-0 py-4 text-sm font-medium"
                aria-label="Manual model number entry"
              >
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Manual</span>
              </TabsTrigger>
              <TabsTrigger 
                value="upload" 
                className="rounded-none border-0 py-4 text-sm font-medium"
                aria-label="Upload image for OCR extraction"
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger 
                value="camera" 
                className="rounded-none border-0 py-4 text-sm font-medium"
                aria-label="Use camera to capture model label"
              >
                <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Camera</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="model-input" className="mb-2 block text-sm font-medium text-slate-700">
                    Model Number
                  </label>
                  <Input
                    id="model-input"
                    placeholder="e.g., MVWB300WQ1"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="border-slate-300 text-lg"
                    aria-describedby="model-hint"
                    disabled={isLoading}
                  />
                  <p id="model-hint" className="mt-2 text-xs text-slate-500">
                    Found on the model label or nameplate of your appliance
                  </p>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !modelNumber.trim()}
                  className="w-full bg-blue-600 py-6 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="p-6">
              <div className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                  role="region"
                  aria-label="Drag and drop area for image upload"
                >
                  <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    Drag and drop an image here
                  </p>
                  <p className="mb-4 text-xs text-slate-600">
                    or click to browse (JPEG, PNG, WebP, GIF up to 3MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Select image file for upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-slate-300"
                  >
                    Choose File
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="camera" className="p-6">
              <div className="space-y-4">
                {!isCameraActive ? (
                  <Button
                    onClick={startCamera}
                    className="w-full bg-blue-600 py-6 text-lg font-semibold hover:bg-blue-700"
                    aria-label="Activate camera to capture model label"
                  >
                    <Camera className="mr-2 h-5 w-5" aria-hidden="true" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    {cameraError && (
                      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
                        <AlertCircle className="mb-2 inline h-4 w-4" aria-hidden="true" />
                        {cameraError}
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg bg-black"
                      aria-label="Live camera feed"
                    />
                    <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCameraCapture}
                        className="flex-1 bg-blue-600 py-6 text-lg font-semibold hover:bg-blue-700"
                        aria-label="Capture image from camera"
                      >
                        Capture
                      </Button>
                      <Button
                        onClick={stopCamera}
                        variant="outline"
                        className="flex-1 border-slate-300 py-6 text-lg font-semibold"
                        aria-label="Stop camera and close"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {recentSearches.length > 0 && (
          <Card className="mt-6 border-0 shadow-lg">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Recent Searches</h3>
                <History className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <div className="grid gap-2">
                {recentSearches.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setModelNumber(item.modelNumber);
                      setSelectedModel(item.modelNumber);
                    }}
                    className="rounded-lg bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`Search for model ${item.modelNumber}`}
                  >
                    {item.modelNumber}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
