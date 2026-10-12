declare module 'qrcode' {
  const QRCode: {
    toDataURL(
      text: string,
      options?: {
        margin?: number;
        width?: number;
        errorCorrectionLevel?: string;
        color?: { dark?: string; light?: string };
      }
    ): Promise<string>;
  };
  export default QRCode;
}
