'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'

/** Kept in step with the server; the server is still the one that enforces it. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface AvatarUploadProps {
  name: string
  avatarUrl?: string | null
}

export function AvatarUpload({ name, avatarUrl }: AvatarUploadProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { update }  = useSession()
  const [busy, setBusy]   = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh(image: string | null) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ])
    // Push the new image into the session so the header avatar follows.
    await update({ image })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again after an error
    if (!file) return

    setError(null)

    if (!ACCEPTED.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP or GIF image.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('That image is larger than 5 MB.')
      return
    }

    const body = new FormData()
    body.append('file', file)

    setBusy('upload')
    try {
      const res = await fetch('/api/users/me/avatar', { method: 'POST', body })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Upload failed')
      }
      const payload = await res.json()
      await refresh(payload.user?.avatarUrl ?? null)
    } catch (err) {
      setError(errorMessage(err, 'Failed to upload the image'))
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove() {
    setError(null)
    setBusy('remove')
    try {
      const res = await fetch('/api/users/me/avatar', { method: 'DELETE' })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to remove the image')
      }
      await refresh(null)
    } catch (err) {
      setError(errorMessage(err, 'Failed to remove the image'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar
        name={name}
        src={avatarUrl}
        className="h-20 w-20"
        fallbackClassName="from-blue-600 to-violet-600 text-lg"
      />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={handleFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
          >
            {busy === 'upload'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Camera className="h-4 w-4" />}
            {avatarUrl ? 'Change photo' : 'Upload photo'}
          </Button>

          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 rounded-xl text-muted-foreground hover:text-destructive"
              disabled={busy !== null}
              onClick={handleRemove}
            >
              {busy === 'remove'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          )}
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF, up to 5 MB.</p>
        )}
      </div>
    </div>
  )
}
