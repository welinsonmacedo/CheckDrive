const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                        {/* Display Installments inside driver history card */}`;

const replaceStr = `                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {/* Display Installments inside driver history card */}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(file, content);
console.log('Removed offending div');
