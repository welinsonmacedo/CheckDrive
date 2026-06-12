import fs from 'fs';

let content = fs.readFileSync('src/modules/driver/pages/ChecklistFlow.tsx', 'utf8');

// Replace {currentStep === X && ( with {true && (
content = content.replace(/\{currentStep === 0 && \(/g, '{true && (');
content = content.replace(/\{currentStep === 1 && \(/g, '{true && (');
content = content.replace(/\{currentStep === 2 && \(/g, '{true && (');
// we don't need step 3 (which was summary) if we are making it single page, but let's keep it visible so it shows the "summary details"
// Wait! If they want single form, step 3 was a summary of what they did. We can hide step 3. 
content = content.replace(/\{currentStep === 3 && \(/g, '{false && (');
content = content.replace(/currentStep > 0 && currentStep < 3/g, 'false');
content = content.replace(/\{currentStep < 3 \?/g, '{false ?');

// Also remove the step headers indicator
content = content.replace(/<div className="flex justify-between items-center px-8 relative mb-8">[\s\S]*?<\/div>\n\s*<\/div>/, '');

// Also remove localforage usage
content = content.replace(/import localforage from "localforage";/g, '');
content = content.replace(/await localforage\.[^;]+;/g, '');
content = content.replace(/localforage\.[^;]+;/g, '');
content = content.replace(/dataRestored/g, 'true');

// remove validations that were previously in handleNextStep and put them at beginning of handleSubmit:
const validationCode = `
      if (!isInternal && !isTrailerOnly) {
        if (!formData.vehicleId) {
          alert("Selecione um veículo.");
          setLoading(false);
          return;
        }
        if (!formData.km) {
          alert("Informe a kilometragem atual.");
          setLoading(false);
          return;
        }
        if (lastKm !== null && Number(formData.km) < Number(lastKm)) {
          alert("Kilometragem inválida. O último KM registrado foi " + lastKm + ".");
          setLoading(false);
          return;
        }
      }

      if (type !== "yard") {
        const selectedVehicle = options.vehicles.find(
          (v: any) => v.id === formData.vehicleId,
        );
        if (
          !isTrailerOnly &&
          selectedVehicle?.requires_trailer &&
          !formData.trailerId
        ) {
          alert("Este veículo exige que o reboque seja selecionado.");
          setLoading(false);
          return;
        }
        if (options.routes.length > 0 && !formData.routeId) {
          alert("Selecione a rota.");
          setLoading(false);
          return;
        }
      }

      if (requireExternalPhotos) {
        const photos = formData.photos;
        const previews = formData.photoPreviews || {};
        const hasFront = photos.front || (previews.front && previews.front.startsWith("data:image/"));
        const hasBack = photos.back || (previews.back && previews.back.startsWith("data:image/"));
        const hasLeft = photos.left || (previews.left && previews.left.startsWith("data:image/"));
        const hasRight = photos.right || (previews.right && previews.right.startsWith("data:image/"));
        
        if (!(hasFront && hasBack && hasLeft && hasRight)) {
           alert("Por favor, tire todas as 4 fotos externas obrigatórias.");
           setLoading(false);
           return;
        }
      }

      const allItemsAnswered = options.items.every((item) => !!formData.itemValues[item.id]);
      if (!allItemsAnswered) {
          alert("Por favor, preencha todos os itens de verificação obrigatórios.");
          setLoading(false);
          return;
      }
`;

content = content.replace('const handleSubmit = async () => {\n    setLoading(true);\n    try {', 'const handleSubmit = async () => {\n    setLoading(true);\n' + validationCode + '\n    try {');


fs.writeFileSync('src/modules/driver/pages/ChecklistFlow.tsx', content);
