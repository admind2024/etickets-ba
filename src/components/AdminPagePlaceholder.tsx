import { ReactNode } from "react";

interface AdminPagePlaceholderProps {
  title: string;
  icon: ReactNode;
  description?: string;
  children?: ReactNode;
}

export const AdminPagePlaceholder = ({ title, icon, description, children }: AdminPagePlaceholderProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 bg-[#f0f7ff] rounded-lg flex items-center justify-center text-[#013DC4]">
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a1f36]">{title}</h2>
            {description && <p className="text-sm text-[#697386]">{description}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm min-h-[400px]">
        {children || (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
              {icon}
            </div>
            <p className="text-[#697386] mb-2">
              Sadržaj za <strong>{title}</strong> će biti dodan ovdje.
            </p>
            <p className="text-sm text-gray-400">Placeholder stranica</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPagePlaceholder;
