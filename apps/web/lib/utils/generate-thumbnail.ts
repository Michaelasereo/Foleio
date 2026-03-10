export function generateThumbnailCSS(title: string): string {
  const safeTitle = title?.trim() || 'Untitled Video';
  return `
    background: linear-gradient(135deg, #F97316, #C2500A);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-weight: 600;
    padding: 24px;
    text-align: center;
    content: "${safeTitle.replace(/"/g, '\\"')}";
  `;
}

export function getThumbnailUrl(content: {
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
  title: string;
  id: string;
}): string | null {
  if (content.thumbnailUrl) {
    return content.thumbnailUrl;
  }
  if (content.muxPlaybackId) {
    return `https://image.mux.com/${content.muxPlaybackId}/thumbnail.jpg?time=1`;
  }
  return null;
}
