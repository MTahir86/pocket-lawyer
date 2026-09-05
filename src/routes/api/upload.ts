import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { createFileRoute } from "@tanstack/react-router";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body =
            (await request.json()) as HandleUploadPresignedBody;

          const result = await handleUploadPresigned({
            body,
            request,
            webhookPublicKey:
              process.env["BLOB_WEBHOOK_PUBLIC_KEY"],

            getSignedToken: async (pathname) => {
              if (!pathname.startsWith("legal-docs/")) {
                throw new Error("Invalid upload pathname.");
              }

              const token = await issueSignedToken({
                pathname,
                operations: ["put"],
                allowedContentTypes: ALLOWED_CONTENT_TYPES,
                maximumSizeInBytes: MAX_FILE_SIZE,
                validUntil: Date.now() + 60 * 60 * 1000,
              });

              return {
                token,
                urlOptions: {
                  allowedContentTypes: ALLOWED_CONTENT_TYPES,
                  maximumSizeInBytes: MAX_FILE_SIZE,
                  validUntil: Date.now() + 10 * 60 * 1000,
                  addRandomSuffix: false,
                  allowOverwrite: false,
                },
              };
            },
          });

          return Response.json(result);
        } catch (error) {
          console.error("Blob upload route error:", error);

          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Unable to prepare file upload.",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
