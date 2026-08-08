import { SITE } from "@/lib/site";
import { Icon } from "./Icons";
export function WhatsAppFloat(){const text=encodeURIComponent("Hello URO. I would like information about returning to Uganda and URO membership.");return <a className="whatsapp-float" href={`https://wa.me/${SITE.whatsapp}?text=${text}`} target="_blank" rel="noreferrer" aria-label="Contact URO on WhatsApp"><Icon name="whatsapp" size={26}/></a>}
