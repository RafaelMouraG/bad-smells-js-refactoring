const ADMIN_PRIORITY_THRESHOLD = 1000;
const USER_MAX_VISIBLE_VALUE = 500;

const ROLE_POLICIES = new Map([
  [
    'ADMIN',
    {
      canView: () => true,
      isPriority: (item) => Boolean(item.priority) || item.value > ADMIN_PRIORITY_THRESHOLD,
    },
  ],
  [
    'USER',
    {
      canView: (item) => item.value <= USER_MAX_VISIBLE_VALUE,
      isPriority: () => false,
    },
  ],
]);

// Papéis desconhecidos não enxergam nenhum item.
const NO_ACCESS_POLICY = { canView: () => false, isPriority: () => false };

class CsvReportFormatter {
  header() {
    return 'ID,NOME,VALOR,USUARIO\n';
  }

  row({ item, user }) {
    return `${item.id},${item.name},${item.value},${user.name}\n`;
  }

  footer(total) {
    return `\nTotal,,\n${total},,\n`;
  }
}

class HtmlReportFormatter {
  header(user) {
    return (
      '<html><body>\n' +
      '<h1>Relatório</h1>\n' +
      `<h2>Usuário: ${user.name}</h2>\n` +
      '<table>\n' +
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n'
    );
  }

  row({ item, isPriority }) {
    const style = isPriority ? ' style="font-weight:bold;"' : '';
    return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  }

  footer(total) {
    return `</table>\n<h3>Total: ${total}</h3>\n</body></html>\n`;
  }
}

// Tipos de relatório desconhecidos geram um relatório vazio.
class EmptyReportFormatter {
  header() {
    return '';
  }

  row() {
    return '';
  }

  footer() {
    return '';
  }
}

const REPORT_FORMATTERS = new Map([
  ['CSV', new CsvReportFormatter()],
  ['HTML', new HtmlReportFormatter()],
]);

const EMPTY_FORMATTER = new EmptyReportFormatter();

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const formatter = REPORT_FORMATTERS.get(reportType) ?? EMPTY_FORMATTER;
    const policy = ROLE_POLICIES.get(user.role) ?? NO_ACCESS_POLICY;
    const visibleItems = [...items].filter((item) => policy.canView(item));

    const rows = visibleItems.map((item) =>
      formatter.row({ item, user, isPriority: policy.isPriority(item) }),
    );
    const total = visibleItems.reduce((sum, item) => sum + item.value, 0);

    return [formatter.header(user), ...rows, formatter.footer(total)].join('').trim();
  }
}
