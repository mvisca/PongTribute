
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m'
};

function colorizar(texto, color) {
    return `${colors[color]}${texto}${colors.reset}`;
}