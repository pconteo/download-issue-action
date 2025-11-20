const core = require("@actions/core");
const github = require("@actions/github");
const XLSX = require("xlsx");

async function run() {
  try {
    // Prendi il token dai secrets o GITHUB_TOKEN
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("Token non trovato. Imposta un secret o usa GITHUB_TOKEN.");
    
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    console.log(`Recupero issue da ${owner}/${repo}...`);

    // Paginazione
    let page = 1;
    let issues = [];

    while (true) {
      const res = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        per_page: 100,
        page,
        state: "all" // prendi sia aperte che chiuse
      });

      if (res.data.length === 0) break;

      issues = issues.concat(res.data);
      page++;
    }

    console.log(`Trovate ${issues.length} issue totali`);

    // Escludi le Pull Request
    const data = issues
      .filter(issue => !issue.pull_request)
      .map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue.labels.map(l => l.name).join(", "),
        assignees: issue.assignees.map(a => a.login).join(", "),
        url: issue.html_url,
      }));

    console.log(`Dopo il filtro PR: ${data.length} issue`);

    if (data.length === 0) {
      console.log("Nessuna issue da esportare.");
    }

    // Crea workbook e foglio Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Issues");

    const output = core.getInput("output") || "issues.xlsx";

    // Salva il file XLSX
    XLSX.writeFile(workbook, output);

    core.setOutput("file", output);
    console.log(`File Excel creato: ${output}`);

  } catch (error) {
    core.setFailed(error.message);
    console.error(error);
  }
}

run();
