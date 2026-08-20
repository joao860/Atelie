// whatsapp.js — monta a mensagem do pedido e o link wa.me
import { formatPrice } from "./utils.js";

/**
 * Constrói o texto do pedido a partir dos itens do carrinho e das
 * configurações da loja, e retorna a URL final do WhatsApp.
 */
export function buildWhatsappUrl({ items, subtotal, settings }) {
  const { whatsappNumber, whatsappMessagePrefix } = settings.contact;
  const { availabilityMessage } = settings.store;

  const lines = [whatsappMessagePrefix, "", "Meu pedido:", ""];

  items.forEach((item) => {
    lines.push(`• ${item.quantity}x ${item.productName} — ${item.variantName}`);
    lines.push(formatPrice(item.unitPrice * item.quantity));
    lines.push("");
  });

  lines.push(`Total estimado: ${formatPrice(subtotal)}`);
  lines.push("");
  lines.push(availabilityMessage);

  const message = lines.join("\n");
  const encoded = encodeURIComponent(message);

  return `https://wa.me/${whatsappNumber}?text=${encoded}`;
}
