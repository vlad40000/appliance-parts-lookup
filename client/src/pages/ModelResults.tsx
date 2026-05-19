import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, ArrowLeft, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DiagramSection {
  id?: number;
  sectionName: string;
  sectionOrder: number;
  diagramImageUrl: string;
  dlPartsSectionId: string;
}

interface Part {
  id?: number;
  itemNumber?: string;
  partNumber: string;
  description?: string;
  price?: string;
  availability?: string;
}

interface ModelResultsProps {
  data: any;
  modelNumber: string;
  onBack: () => void;
}

export default function ModelResults({ data, modelNumber, onBack }: ModelResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiagram, setSelectedDiagram] = useState<DiagramSection | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const diagrams = data?.diagrams || [];
  const parts = data?.parts || {};
  const error = data?.error;

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const filterParts = (sectionParts: Part[]) => {
    if (!searchQuery.trim()) return sectionParts;
    const query = searchQuery.toLowerCase();
    return sectionParts.filter(
      (part) =>
        part.partNumber.toLowerCase().includes(query) ||
        part.description?.toLowerCase().includes(query) ||
        part.itemNumber?.toLowerCase().includes(query)
    );
  };

  // Memoize filtered parts to prevent unnecessary recalculations
  const filteredPartsBySection = useMemo(() => {
    const result: Record<string, Part[]> = {};
    Object.entries(parts).forEach(([section, sectionParts]) => {
      result[section] = filterParts(sectionParts as Part[]);
    });
    return result;
  }, [parts, searchQuery]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Button 
            onClick={onBack} 
            variant="outline" 
            className="mb-6"
            aria-label="Go back to search"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <Card className="border-0 shadow-lg">
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" aria-hidden="true" />
              <p className="text-lg text-red-600 font-semibold">{error}</p>
              <p className="mt-2 text-slate-600">Please check the model number and try again.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Button 
          onClick={onBack} 
          variant="outline" 
          className="mb-6"
          aria-label="Go back to search"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            {modelNumber}
          </h1>
          <p className="text-slate-600">
            {diagrams.length} diagram sections • {Object.values(parts).flat().length} parts available
          </p>
        </div>

        <Card className="mb-6 border-0 shadow-lg p-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <Input
              placeholder="Search parts by number, description, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-300"
              aria-label="Search parts"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-slate-600">
              Found {Object.values(filteredPartsBySection).flat().length} matching parts
            </p>
          )}
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {diagrams.map((diagram: DiagramSection, index: number) => {
            const sectionKey = diagram.dlPartsSectionId || diagram.sectionName;
            const sectionParts = filteredPartsBySection[sectionKey] || [];
            const isExpanded = expandedSections.has(sectionKey);

            return (
              <Card key={index} className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="space-y-0">
                  <button
                    onClick={() => setSelectedDiagram(diagram)}
                    className="w-full relative group overflow-hidden bg-slate-200 aspect-square flex items-center justify-center hover:bg-slate-300 transition-colors"
                    aria-label={`View full diagram for ${diagram.sectionName}`}
                  >
                    {diagram.diagramImageUrl ? (
                      <img
                        src={diagram.diagramImageUrl}
                        alt={`Diagram for ${diagram.sectionName}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-slate-400 text-center">
                        <p className="text-sm">No diagram available</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                    </div>
                  </button>

                  <div className="p-4">
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      className="w-full flex items-center justify-between font-semibold text-slate-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                      aria-expanded={isExpanded}
                      aria-controls={`parts-${sectionKey}`}
                    >
                      <span className="text-sm md:text-base">{diagram.sectionName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {sectionParts.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-5 w-5" aria-hidden="true" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div id={`parts-${sectionKey}`} className="mt-4 space-y-2 border-t pt-4">
                        {sectionParts.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs md:text-sm">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="text-left p-2 font-semibold text-slate-700">Item</th>
                                  <th className="text-left p-2 font-semibold text-slate-700">Part #</th>
                                  <th className="text-left p-2 font-semibold text-slate-700">Description</th>
                                  <th className="text-right p-2 font-semibold text-slate-700">Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sectionParts.map((part: Part, partIndex: number) => (
                                  <tr key={partIndex} className="border-b hover:bg-slate-50">
                                    <td className="p-2 text-slate-600">{part.itemNumber || "-"}</td>
                                    <td className="p-2 font-mono text-blue-600">{part.partNumber}</td>
                                    <td className="p-2 text-slate-600 truncate" title={part.description}>
                                      {part.description || "-"}
                                    </td>
                                    <td className="p-2 text-right font-semibold text-slate-900">
                                      {part.price || "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm py-2">No parts found matching your search</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {diagrams.length === 0 && (
          <Card className="border-0 shadow-lg p-8 text-center">
            <p className="text-slate-600">No diagrams available for this model</p>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedDiagram} onOpenChange={() => setSelectedDiagram(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDiagram?.sectionName} - {modelNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedDiagram && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
                  variant="outline"
                  size="sm"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="text-sm font-medium text-slate-600 min-w-[60px]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.2))}
                  variant="outline"
                  size="sm"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="overflow-auto max-h-[60vh] flex items-center justify-center bg-slate-100 rounded-lg">
                {selectedDiagram.diagramImageUrl ? (
                  <img
                    src={selectedDiagram.diagramImageUrl}
                    alt={`Full diagram for ${selectedDiagram.sectionName}`}
                    style={{ transform: `scale(${zoomLevel})` }}
                    className="transition-transform"
                  />
                ) : (
                  <p className="text-slate-400">No diagram available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
