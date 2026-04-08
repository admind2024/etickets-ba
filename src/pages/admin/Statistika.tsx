import { BarChart3 } from "lucide-react";
import AdminPagePlaceholder from "@/components/AdminPagePlaceholder";

const Statistika = () => {
  return (
    <AdminPagePlaceholder
      title="Statistics"
      icon={<BarChart3 size={24} />}
      description="Statistika prodaje i posjeta"
    />
  );
};

export default Statistika;
