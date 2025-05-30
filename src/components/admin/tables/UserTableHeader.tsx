
interface UserTableHeaderProps {
  title: string;
  count: number;
}

export const UserTableHeader = ({ title, count }: UserTableHeaderProps) => {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
        {title} ({count})
      </h3>
    </div>
  );
};
