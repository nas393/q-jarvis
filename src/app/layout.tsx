import type {Metadata,Viewport} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Q | Private Command Centre",description:"Private Q workspace",robots:{index:false,follow:false}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#090d14"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}