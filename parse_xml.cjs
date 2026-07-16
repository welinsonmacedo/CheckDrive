const xmlString = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe123">
      <ide>
        <nNF>12345</nNF>
        <dhEmi>2023-10-27T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Fornecedor Teste</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <xProd>Produto Teste</xProd>
          <qCom>10.0000</qCom>
          <vUnCom>5.5000</vUnCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

// simple regex parsing for test
const nNFMatch = xmlString.match(/<nNF>(.*?)<\/nNF>/);
const chNFeMatch = xmlString.match(/<chNFe>(.*?)<\/chNFe>/) || xmlString.match(/Id="NFe(.*?)"/);
const emitMatch = xmlString.match(/<emit>([\s\S]*?)<\/emit>/);
let cnpj = "", xNome = "";
if (emitMatch) {
  const cnpjMatch = emitMatch[1].match(/<CNPJ>(.*?)<\/CNPJ>/);
  if (cnpjMatch) cnpj = cnpjMatch[1];
  const nameMatch = emitMatch[1].match(/<xNome>(.*?)<\/xNome>/);
  if (nameMatch) xNome = nameMatch[1];
}

console.log("NF:", nNFMatch?.[1]);
console.log("Key:", chNFeMatch?.[1]);
console.log("Supplier:", cnpj, xNome);

const detMatches = xmlString.match(/<det[\s\S]*?<\/det>/g) || [];
const items = detMatches.map(det => {
  const cProdMatch = det.match(/<cProd>(.*?)<\/cProd>/);
  const xProdMatch = det.match(/<xProd>(.*?)<\/xProd>/);
  const qComMatch = det.match(/<qCom>(.*?)<\/qCom>/);
  const vUnComMatch = det.match(/<vUnCom>(.*?)<\/vUnCom>/);
  return {
    cProd: cProdMatch ? cProdMatch[1] : '',
    xProd: xProdMatch ? xProdMatch[1] : '',
    qCom: qComMatch ? parseFloat(qComMatch[1]) : 0,
    vUnCom: vUnComMatch ? parseFloat(vUnComMatch[1]) : 0
  };
});
console.log("Items:", items);

