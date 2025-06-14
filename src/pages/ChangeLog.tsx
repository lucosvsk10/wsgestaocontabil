
import ChangeLogNavbar from "@/components/changelog/ChangeLogNavbar";
import ChangeLogHeader from "@/components/changelog/ChangeLogHeader";
import Version2Section from "@/components/changelog/Version2Section";
import Version1Section from "@/components/changelog/Version1Section";
import ScrollToTopButton from "@/components/changelog/ScrollToTopButton";

const ChangeLog = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-[#020817]">
      <ChangeLogNavbar />

      {/* Main Content */}
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <ChangeLogHeader />
          <Version2Section />
          <Version1Section />
          <ScrollToTopButton />
        </div>
      </main>
    </div>
  );
};

export default ChangeLog;
