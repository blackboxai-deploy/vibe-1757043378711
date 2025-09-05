import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NextAuthProvider } from '@/components/providers/next-auth-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AnimaGenius - AI-Powered Video Creation Platform',
  description: 'Transform documents, data, and media into professional animated videos using advanced AI technology.',
  keywords: 'AI video creation, document to video, animation platform, video synthesis, content creation',
  authors: [{ name: 'AnimaGenius Team' }],
  openGraph: {
    title: 'AnimaGenius - AI-Powered Video Creation',
    description: 'Create professional videos from your documents and data with AI',
    type: 'website',
  },
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <NextAuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster 
                position="top-right"
                expand={false}
                richColors
              />
            </ThemeProvider>
          </NextAuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}