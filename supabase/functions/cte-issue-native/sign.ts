import { SignedXml } from "npm:xml-crypto@6.1.2";

export function signCteXml(xml: string, privateKeyPem: string, certificatePem: string) {
  const signer = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
  });

  signer.addReference({
    xpath: "//*[local-name(.)='infCte']",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });

  signer.getKeyInfoContent = SignedXml.getKeyInfoContent;
  signer.computeSignature(xml, {
    location: { reference: "//*[local-name(.)='infCte']", action: "after" },
  });
  return signer.getSignedXml();
}
