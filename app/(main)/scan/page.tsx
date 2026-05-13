'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNav } from '@/app/components/AppLayout'

// ─── Flash Icon ───────────────────────────────────────────────────────────────
const FlashIcon = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{ color: active ? '#FFD700' : '#0D307F', cursor: 'pointer' }}>
    <svg width="20" height="20" viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  </div>
)

// ─── Scan Page ────────────────────────────────────────────────────────────────
const ScanPage: React.FC = () => {
  const { setActiveNav, setHeaderSlot, setFullBleed } = useNav()

  const [mode, setMode] = useState<'IDCARD' | 'DOCUMENT' | 'PHOTO'>('DOCUMENT')
  const [flashOn, setFlashOn] = useState(false)
  const [flashOverlay, setFlashOverlay] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Stable toggle so FlashIcon onClick doesn't recreate on every render
  const toggleFlash = useCallback(() => setFlashOn(prev => !prev), [])

  // 1️⃣  Enter: activate fullBleed + set SCAN tab
  useEffect(() => {
    setActiveNav('SCAN')
    setFullBleed(true)

    // 2️⃣  Exit: reset both
    return () => {
      setFullBleed(false)
      setHeaderSlot(null)
    }
  }, [setActiveNav, setFullBleed, setHeaderSlot])

  // 3️⃣  Sync header slot whenever flashOn changes
  useEffect(() => {
    setHeaderSlot(<FlashIcon active={flashOn} onClick={toggleFlash} />)
  }, [flashOn, toggleFlash, setHeaderSlot])

  // 4️⃣  Camera stream
  useEffect(() => {
    let currentStream: MediaStream

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        currentStream = mediaStream
        if (videoRef.current) videoRef.current.srcObject = mediaStream
      } catch (err) {
        console.error('Camera error:', err)
      }
    }

    startCamera()
    return () => currentStream?.getTracks().forEach(t => t.stop())
  }, [])

  // ─── Capture ─────────────────────────────────────────────────────────────
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    setFlashOverlay(true)
    setTimeout(() => setFlashOverlay(false), 150)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    alert('Foto berhasil diambil 📸')
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  // NOTE: PhoneLayout wraps this in a `position:relative` div when fullBleed=true,
  // so all position:absolute children anchor correctly to the screen area.
  return (
    <>
      {/* Live camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 1, pointerEvents: 'none',
        }}
      />

      {/* Flash overlay */}
      {flashOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#fff', opacity: 0.3,
          zIndex: 40, pointerEvents: 'none',
        }} />
      )}

      {/* UI layer */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
      }}>
        {/* Scanning frame */}
        <div style={{
          width: '85%', height: '60%',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '24px', position: 'relative',
          transform: 'translateY(-40px)',
          boxShadow: '0 0 0 1000px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {/* Corner accents */}
          {[
            { top: -2, left: -2, borderLeft: '4px solid #fff', borderTop: '4px solid #fff', borderRadius: '24px 0 0 0' },
            { top: -2, right: -2, borderRight: '4px solid #fff', borderTop: '4px solid #fff', borderRadius: '0 24px 0 0' },
            { bottom: -2, left: -2, borderLeft: '4px solid #fff', borderBottom: '4px solid #fff', borderRadius: '0 0 0 24px' },
            { bottom: -2, right: -2, borderRight: '4px solid #fff', borderBottom: '4px solid #fff', borderRadius: '0 0 24px 0' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: '40px', height: '40px', ...s }} />
          ))}

          {/* Animated scan line */}
          <div className="scanner-line" />

          {/* Hint text */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.6)', padding: '10px 20px',
            borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: '11px', whiteSpace: 'nowrap', fontWeight: 600,
          }}>
            Align receipt within frame
          </div>
        </div>

        {/* Mode selector */}
        <div style={{
          position: 'absolute', bottom: '110px', left: '50%',
          transform: 'translateX(-50%)', display: 'flex', gap: '28px',
          color: '#fff', fontSize: '11px', fontWeight: 800,
          letterSpacing: '1px', zIndex: 50,
        }}>
          {(['IDCARD', 'DOCUMENT', 'PHOTO'] as const).map(m => (
            <span
              key={m}
              onClick={() => setMode(m)}
              style={{
                opacity: mode === m ? 1 : 0.35,
                borderBottom: mode === m ? '2px solid #fff' : '2px solid transparent',
                paddingBottom: '6px', cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {m}
            </span>
          ))}
        </div>

        {/* Shutter controls */}
        <div style={{
          position: 'absolute', bottom: '20px', width: '100%',
          display: 'flex', justifyContent: 'space-around',
          alignItems: 'center', padding: '0 30px', zIndex: 50,
        }}>
          {/* Gallery picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '45px', height: '45px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>

          {/* Shutter */}
          <div
            onClick={handleCapture}
            style={{
              width: '70px', height: '70px', borderRadius: '50%',
              border: '4px solid #fff', padding: '4px', cursor: 'pointer',
            }}
          >
            <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: '50%' }} />
          </div>

          {/* Flash toggle (duplicate of header for thumb reach) */}
          <div
            onClick={toggleFlash}
            style={{
              width: '45px', height: '45px', borderRadius: '50%',
              background: flashOn ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={flashOn ? '#FFD700' : 'none'}
              stroke={flashOn ? '#FFD700' : '#fff'} strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => alert('Gambar dipilih 🖼️')
          reader.readAsDataURL(file)
        }}
      />

      <style jsx global>{`
        .scanner-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(to right, transparent, #fff, transparent);
          box-shadow: 0 0 15px 2px #fff;
          top: 0;
          animation: scan 3s ease-in-out infinite;
          z-index: 10;
        }
        @keyframes scan {
          0%, 100% { top: 5%; }
          50%       { top: 95%; }
        }
      `}</style>
    </>
  )
}

export default ScanPage
