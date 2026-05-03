import { createRouteHandler } from 'uploadthing/next'
import { ourFileRouter } from './core'

// Create the Next.js App Router route handlers for UploadThing
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
})
