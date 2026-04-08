import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileFilterDrawerProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const MobileFilterDrawer = ({ categories, activeCategory, onCategoryChange }: MobileFilterDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategorySelect = (category: string) => {
    onCategoryChange(category);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
        <Filter className="w-4 h-4" />
        Filteri
        {activeCategory !== "Svi" && (
          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">1</span>
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setIsOpen(false)} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-3xl z-50 transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="p-6">
          {/* Handle */}
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Kategorije</h3>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeCategory === category
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground border border-border",
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Reset Button */}
          {activeCategory !== "Svi" && (
            <Button variant="outline" className="w-full" onClick={() => handleCategorySelect("Svi")}>
              Resetuj filtere
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileFilterDrawer;
