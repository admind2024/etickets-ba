import { ShoppingBasket } from "lucide-react";
import AdminPagePlaceholder from "@/components/AdminPagePlaceholder";

const PregledProdaje = () => {
  return (
    <AdminPagePlaceholder
      title="Pregled prodaje"
      icon={<ShoppingBasket size={24} />}
      description="Pregled svih prodaja i transakcija"
    />
  );
};

export default PregledProdaje;
