import React from 'react'
import logo from '../assets/logo'

// BrandMark — the Streakk swoosh + wordmark + optional subtitle
// size: 'sm' (sidebar), 'lg' (login screen)
export default function BrandMark({ size = 'sm', subtitle = true }) {
  const isLg = size === 'lg'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isLg ? 'center' : 'flex-start', gap: isLg ? 8 : 5 }}>
      {/* Row: swoosh icon + STREAKK wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 10 : 7 }}>
        {/* The orange swoosh */}
        <img
          src={logo}
          alt="Streakk"
          style={{
            height:      isLg ? 36 : 22,
            width:       'auto',
            objectFit:   'contain',
            objectPosition: 'left center',
            flexShrink:  0,
          }}
        />
        {/* Wordmark: STREAKK in brand font */}
        <span style={{
          fontSize:      isLg ? 26 : 16,
          fontWeight:    800,
          letterSpacing: '-0.02em',
          color:         '#0c4a6e',   /* sky-900 */
          lineHeight:    1,
          fontFamily:    'var(--font)',
        }}>
          Streakk
        </span>
      </div>

      {/* Subtitle: Inventory Management */}
      {subtitle && (
        <div style={{
          fontSize:      isLg ? 12 : 10,
          fontWeight:    600,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color:         'var(--sky-600)',
          paddingLeft:   isLg ? 0 : 1,
        }}>
          Inventory Management
        </div>
      )}
    </div>
  )
}
