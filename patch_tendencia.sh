#!/bin/bash
sed -i.bak -e '1445,1584c\
        <ReportTendenciaTab\
          records={records}\
          tipoImportacaoFilter={tipoImportacaoFilter}\
          categoryFilter={categoryFilter}\
          placaFilter={placaFilter}\
          fornecedorFilter={fornecedorFilter}\
          onResetFilters={() => {\
            setCategoryFilter("Todas");\
            setTipoImportacaoFilter("Todas");\
            setSelectedPeriod("0");\
            setPlacaFilter("");\
            setFornecedorFilter("");\
          }}\
          accountMappings={accountMappings}\
        />\
' src/modules/data_import/pages/SharedReportPage.tsx
