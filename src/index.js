const core = require("@actions/core");
const github = require("@actions/github");
const XLSX = require("xlsx");

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    let page = 1;
    let issues = [];

    // Paginate issues finché ce ne sono
    while (true) {
      const res = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        per_page: 100,
        page,
      });

      if (res.data.length === 0) break;

      issues = issues.concat(res.data);
      page++;
    }

    // Prepara i dati per Excel
    const data = issues.map(issue => ({
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

    // Crea workbook e foglio
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Issues");

    const output = core.getInput("output");

    // Salva file
    XLSX.writeFile(workbook, output);

    core.setOutput("file", output);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
