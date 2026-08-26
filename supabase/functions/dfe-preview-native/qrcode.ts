const QR_CODE_URL_AL = "http://nfce.sefaz.al.gov.br/QRCode/consultarNFCe.jsp";
const KEY_URL_AL = "http://www.sefaz.al.gov.br/nfce/consulta";

export function addNfceSupplement(xml: string, model: "55" | "65", chaveAcesso: string) {
  if (model !== "65") return xml;

  // QR-Code v3 (NT 2025.001), emissão normal/on-line (tpEmis=1):
  // <url>?p=<chNFe>|3|<tpAmb>
  // Não utiliza CSC/idCSC neste fluxo.
  const qrCode = `${QR_CODE_URL_AL}?p=${chaveAcesso}|3|2`;
  const supplement = `<infNFeSupl><qrCode><![CDATA[${qrCode}]]></qrCode><urlChave>${KEY_URL_AL}</urlChave></infNFeSupl>`;

  if (xml.includes("<Signature")) return xml.replace("<Signature", `${supplement}<Signature`);
  return xml.replace("</NFe>", `${supplement}</NFe>`);
}
