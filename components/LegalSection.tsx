interface LegalSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export default function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
