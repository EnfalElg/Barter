import { PostItemForm } from "@/app/post/post-item-form";

export const metadata = {
  title: "İlan ver",
  description:
    "Gemini 1.5 Flash ile anında değerleme — sosyal ticaret tarzı ilan oluşturma.",
};

export default function PostPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(255,79,1,0.14),transparent_50%),linear-gradient(180deg,#faf9f7_0%,#fffcf9_40%,#f8f5ff_100%)]"
      />
      <div className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
        <PostItemForm />
      </div>
    </div>
  );
}
