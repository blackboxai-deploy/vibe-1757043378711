'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PlayCircle, Upload, Zap, Star, Users, TrendingUp, Shield } from 'lucide-react'

// Landing page for non-authenticated users
function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AnimaGenius
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => signIn()}>
                Sign In
              </Button>
              <Button onClick={() => signIn()} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge className="mb-4 px-4 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              🚀 AI-Powered Video Creation Platform
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-600 dark:from-white dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
            Transform Documents into
            <br />
            Professional Videos
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Upload PDFs, Word docs, spreadsheets, or media files and watch as AI transforms them 
            into engaging, professional videos in minutes. Perfect for presentations, marketing, 
            training, and content creation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={() => signIn()}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Creating Videos
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-3">
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">10K+</div>
              <div className="text-gray-600 dark:text-gray-400">Videos Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">50+</div>
              <div className="text-gray-600 dark:text-gray-400">File Formats</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">99.9%</div>
              <div className="text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to create amazing videos
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Powerful AI tools that make video creation simple and professional
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Upload className="h-10 w-10 text-indigo-600 mb-2" />
                <CardTitle>Smart File Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Upload PDFs, Word docs, Excel files, images, audio, and video. 
                  Our AI extracts content and creates compelling narratives.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Zap className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>AI Script Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Advanced AI analyzes your content and generates engaging scripts 
                  with perfect timing and visual cues.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <PlayCircle className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Professional Rendering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Multiple rendering engines ensure high-quality output 
                  in various formats and resolutions up to 4K.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Start free, upgrade as you grow
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Free Tier */}
            <Card className="relative border-2 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <div className="text-3xl font-bold">$0<span className="text-sm text-gray-500">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 5 videos per month</li>
                  <li>• 2-minute max duration</li>
                  <li>• 100MB file limit</li>
                  <li>• Basic templates</li>
                  <li>• Community support</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" onClick={() => signIn()}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
            
            {/* Starter Tier */}
            <Card className="relative border-2 border-indigo-200 dark:border-indigo-800">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="text-3xl font-bold">$29<span className="text-sm text-gray-500">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 25 videos per month</li>
                  <li>• 10-minute max duration</li>
                  <li>• 500MB file limit</li>
                  <li>• Premium templates</li>
                  <li>• No watermark</li>
                  <li>• Email support</li>
                </ul>
                <Button className="w-full mt-4" onClick={() => signIn()}>
                  Choose Starter
                </Button>
              </CardContent>
            </Card>
            
            {/* Pro Tier */}
            <Card className="relative border-2 border-purple-300 dark:border-purple-700 scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <div className="text-3xl font-bold">$99<span className="text-sm text-gray-500">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 100 videos per month</li>
                  <li>• 30-minute max duration</li>
                  <li>• 2GB file limit</li>
                  <li>• All templates</li>
                  <li>• API access</li>
                  <li>• 4K export</li>
                  <li>• Priority support</li>
                </ul>
                <Button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => signIn()}>
                  Choose Pro
                </Button>
              </CardContent>
            </Card>
            
            {/* Enterprise Tier */}
            <Card className="relative border-2 border-yellow-300 dark:border-yellow-700">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <div className="text-3xl font-bold">$499<span className="text-sm text-gray-500">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Unlimited videos</li>
                  <li>• Unlimited duration</li>
                  <li>• 10GB file limit</li>
                  <li>• White label</li>
                  <li>• Custom integrations</li>
                  <li>• Admin panel</li>
                  <li>• Dedicated support</li>
                </ul>
                <Button className="w-full mt-4" variant="outline" onClick={() => signIn()}>
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">AnimaGenius</h3>
              </div>
              <p className="text-gray-400">
                Transform your documents and data into professional videos with the power of AI.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>API</li>
                <li>Templates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Documentation</li>
                <li>Status</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Privacy</li>
                <li>Terms</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AnimaGenius. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Dashboard for authenticated users
function UserDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome back! Create amazing videos from your documents.
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Videos Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500">of 5 this month</p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Duration Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0:00</div>
              <p className="text-xs text-gray-500">of 2:00 max</p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Storage Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 MB</div>
              <p className="text-xs text-gray-500">of 100 MB</p>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Free</div>
              <Button size="sm" className="mt-2 w-full">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your latest video projects and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="mb-4">Upload your first document to get started</p>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main page component
export default function HomePage() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  if (session) {
    return <UserDashboard />
  }
  
  return <LandingPage />
}