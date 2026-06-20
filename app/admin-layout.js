export const metadata = {
  title: "Admin Zahra Mobil — Dashboard Internal",
  description: "Dashboard internal untuk manajemen inventaris, sales CRM, dan keuangan Zahra Mobil.",
  robots: "noindex, nofollow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ECE9D8",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, overflowX: "hidden", maxWidth: "100vw", background: "#ECE9D8" }}>{children}</body>
    </html>
  );
}
