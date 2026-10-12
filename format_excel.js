const ExcelJS = require('exceljs');

async function formatExcel() {
    const filePath = 'C:\\Users\\Admin\\Documents\\GitHub\\Hoja de cálculo sin título.xlsx';
    const outputPath = 'C:\\Users\\Admin\\Documents\\GitHub\\Hoja de cálculo sin título_formateada.xlsx';
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    workbook.eachSheet((worksheet) => {
        // Freeze first row
        worksheet.views = [
            {state: 'frozen', xSplit: 0, ySplit: 1}
        ];
        
        const columnLengths = [];
        
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                // Formatting for all cells
                cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                cell.border = {
                    top: {style:'thin'},
                    left: {style:'thin'},
                    bottom: {style:'thin'},
                    right: {style:'thin'}
                };
                
                // Formatting for header (row 1)
                if (rowNumber === 1) {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF4F81BD' } // Blueish header
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
                
                // Calculate max length for auto-fit
                const val = cell.value ? cell.value.toString() : '';
                const length = val.length;
                if (!columnLengths[colNumber]) {
                    columnLengths[colNumber] = 0;
                }
                if (length > columnLengths[colNumber]) {
                    columnLengths[colNumber] = length;
                }
            });
        });
        
        // Apply column widths
        for (let i = 1; i < columnLengths.length; i++) {
            if (columnLengths[i]) {
                worksheet.getColumn(i).width = Math.min(Math.max(columnLengths[i] + 2, 12), 60);
            } else {
                worksheet.getColumn(i).width = 12;
            }
        }
    });
    
    await workbook.xlsx.writeFile(outputPath);
    console.log('Archivo formateado exitosamente.');
}

formatExcel().catch(err => {
    console.error('Ocurrió un error:', err);
    process.exit(1);
});
