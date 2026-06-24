import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibePath — Build it. Learn it. Master it.",
  description: "Generate any app with AI, then master the code behind it through an interactive learning journey.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('vp-theme');if(t!=='light')document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
