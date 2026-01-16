import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showUploadButton?: boolean;
}

export function Header({
  title,
  subtitle,
  showUploadButton = true,
}: HeaderProps) {
  return (
    <header className="flex items-start justify-between px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {showUploadButton && (
        <Link href="/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Transcript
          </Button>
        </Link>
      )}
    </header>
  );
}

