# Project Instructions & Memory Rules

## UI & Component Standards
- **Always use shadcn UI components (`@/components/ui/*`)** instead of writing raw custom `View`, `Text`, or `Pressable` styles whenever building or refactoring UI elements.
- Available shadcn components:
  - `Button` (`@/components/ui/button`)
  - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`@/components/ui/card`)
  - `Badge`, `BadgeText` (`@/components/ui/badge`)
  - `Input` (`@/components/ui/input`)
  - `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` (`@/components/ui/select`)
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@/components/ui/tabs`)
  - `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel` (`@/components/ui/alert-dialog`)
  - `Alert`, `AlertTitle`, `AlertDescription` (`@/components/ui/alert`)
  - `Separator` (`@/components/ui/separator`)
  - `Skeleton` (`@/components/ui/skeleton`)
- When creating any new UI component, place it in `src/components/ui/` following the same compound shadcn pattern.

## Environment & Secrets
- Never commit private API keys or secrets to git.
- Keep `.env` and `.env*.local` untracked in `.gitignore`.
- Expo frontend variables must use `EXPO_PUBLIC_` prefix to be available in client code.
- Backend secrets are configured in Convex (`npx convex env set`).
