import "./globals.css";

export const metadata = {
  title: "Motor Testing Pipeline",
  description: "Gated D.C./A.C. motor testing workflow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
