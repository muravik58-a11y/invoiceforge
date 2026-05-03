import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { auth } from '@clerk/nextjs/server'

const f = createUploadthing()

export const ourFileRouter = {
  /**
   * Logo uploader – accepts a single image up to 4 MB.
   * Only authenticated Clerk users may upload.
   */
  logoUploader: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Verify the user is signed in via Clerk
      const { userId, orgId } = await auth()

      if (!userId) {
        throw new Error('Unauthorized')
      }

      // Pass userId and orgId through to onUploadComplete
      return { userId, orgId: orgId ?? null }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Return the uploaded file URL so the client can persist it
      return {
        uploadedBy: metadata.userId,
        orgId: metadata.orgId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
