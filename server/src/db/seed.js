import { pool } from './pool.js';

// Inserts demo data for the first board, lists, cards, labels, members, and inbox.
async function seedDatabase() {
  await pool.query('begin');

  try {
    await pool.query(`
      truncate table
        checklist_items,
        checklists,
        card_members,
        card_labels,
        inbox_cards,
        cards,
        labels,
        members,
        lists,
        boards
      restart identity cascade
    `);

    const board = await pool.query(
      `insert into boards (title) values ($1) returning id`,
      ['My Trello board']
    );
    const boardId = board.rows[0].id;

    const todoList = await insertList(boardId, 'Trello Starter Guide', 1000);
    const todayList = await insertList(boardId, 'Today', 2000);
    const weekList = await insertList(boardId, 'This Week', 3000);
    const laterList = await insertList(boardId, 'Later', 4000);

    await insertCard(todoList, 'New to Trello? Start here', 1000);
    await insertCard(todoList, 'Capture from email, Slack, and Teams', 2000);
    await insertCard(todayList, 'Eat by 8', 1000);
    await insertCard(todayList, 'Start using Trello', 2000);
    await insertCard(weekList, 'Plan the first project workflow', 1000);
    await insertCard(laterList, 'Review future feature ideas', 1000);

    await pool.query(
      `insert into labels (board_id, name, color)
       values
        ($1, 'Priority', '#f87168'),
        ($1, 'Design', '#9f8fef'),
        ($1, 'Backend', '#4bce97'),
        ($1, 'Frontend', '#579dff'),
        ($1, 'Review', '#f5cd47')`,
      [boardId]
    );

    await pool.query(
      `insert into members (name, email, avatar_color)
       values
        ('Piyush', 'piyush@example.com', '#0c66e4'),
        ('Aarav', 'aarav@example.com', '#22a06b'),
        ('Mira', 'mira@example.com', '#943d73')`
    );

    await pool.query(
      `insert into inbox_cards (title, position)
       values
        ('Test email from May 2026', 1000),
        ('Consolidate your to-dos', 2000)`
    );

    await pool.query('commit');
    console.log('Seed data inserted.');
  } catch (error) {
    await pool.query('rollback');
    throw error;
  } finally {
    await pool.end();
  }
}

// Inserts one board list and returns its generated id.
async function insertList(boardId, title, position) {
  const result = await pool.query(
    `insert into lists (board_id, title, position) values ($1, $2, $3) returning id`,
    [boardId, title, position]
  );

  return result.rows[0].id;
}

// Inserts one card in a list and returns its generated id.
async function insertCard(listId, title, position) {
  const result = await pool.query(
    `insert into cards (list_id, title, position) values ($1, $2, $3) returning id`,
    [listId, title, position]
  );

  return result.rows[0].id;
}

seedDatabase().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

