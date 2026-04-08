import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="hidden md:flex flex-wrap justify-center gap-2 md:gap-3">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={cn(
            "px-4 md:px-6 py-2 md:py-2.5 rounded-full text-sm font-medium transition-all duration-300",
            activeCategory === category
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
