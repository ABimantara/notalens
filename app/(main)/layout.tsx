'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/components/AppLayout'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
    }
  }, [router])

  return (
    <AppLayout defaultNav="HOME">
      {children}
    </AppLayout>
  )
}