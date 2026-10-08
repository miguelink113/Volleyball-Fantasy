import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });

const expectedTables = {
    profiles: [
        "id", "email", "username", "created_at", "updated_at",
    ],
    competitions: [
        "id", "rfevb_id", "name", "category", "active", "created_at", "updated_at",
    ],
    seasons: [
        "id", "competition_id", "rfevb_id", "name", "is_current", "starts_at",
        "ends_at", "created_at", "updated_at",
    ],
    teams: [
        "id", "competition_id", "season_id", "rfevb_id", "name", "active",
        "created_at", "updated_at",
    ],
    players: [
        "id", "competition_id", "season_id", "team_id", "rfevb_id", "first_name",
        "last_name", "display_name", "position", "dorsal", "active", "created_at",
        "updated_at",
    ],
    rounds: [
        "id", "competition_id", "season_id", "round_number", "name", "starts_at",
        "ends_at", "status", "created_at", "updated_at",
    ],
    matches: [
        "id", "competition_id", "season_id", "round_id", "rfevb_match_id",
        "match_date", "home_team_id", "away_team_id", "home_sets", "away_sets",
        "status", "sets", "created_at", "updated_at",
    ],
    match_player_stats: [
        "id", "competition_id", "season_id", "match_id", "player_id", "team_id",
        "position", "sets_played", "points_total", "points_breakout", "won_lost",
        "serve_total", "serve_errors", "serve_aces", "reception_total",
        "reception_errors", "reception_positive", "reception_excellent",
        "attack_total", "attack_errors", "attack_blocked", "attack_excellent",
        "attack_excellent_percentage", "block_points", "raw_json", "created_at",
        "updated_at",
    ],
    player_market_values: [
        "id", "competition_id", "season_id", "player_id", "round_id", "price",
        "valid_from", "valid_to", "calculation_reason",
    ],
    private_leagues: [
        "id", "owner_user_id", "competition_id", "season_id", "name", "join_code",
        "active", "created_at", "updated_at",
    ],
    private_league_members: [
        "id", "league_id", "user_id", "role", "joined_at",
    ],
    fantasy_teams: [
        "id", "league_id", "user_id", "competition_id", "season_id", "name",
        "budget", "created_at", "updated_at",
    ],
    fantasy_team_players: [
        "id", "fantasy_team_id", "league_id", "competition_id", "season_id",
        "player_id", "joined_round_id", "buy_price", "left_round_id", "joined_at",
        "left_at", "is_active",
    ],
    lineups: [
        "id", "fantasy_team_id", "competition_id", "season_id", "round_id",
        "created_at", "updated_at",
    ],
    lineup_players: [
        "lineup_id", "competition_id", "season_id", "player_id", "position_slot",
    ],
    player_match_scores: [
        "id", "competition_id", "season_id", "player_id", "match_id", "round_id",
        "scoring_version", "score", "breakdown", "is_provisional", "calculated_at",
    ],
    player_round_scores: [
        "id", "competition_id", "season_id", "player_id", "round_id",
        "scoring_version", "score", "breakdown", "is_provisional", "calculated_at",
    ],
    fantasy_scores: [
        "id", "fantasy_team_id", "competition_id", "season_id", "lineup_id",
        "round_id", "scoring_version", "score", "breakdown", "calculated_at",
    ],
    transactions: [
        "id", "fantasy_team_id", "league_id", "competition_id", "season_id",
        "player_id", "round_id", "type", "amount", "created_at",
    ],
} as const;

type TableName = keyof typeof expectedTables;

interface ColumnRecord {
    table_name: TableName;
    column_name: string;
    data_type: string;
    is_nullable: "YES" | "NO";
}

interface ConstraintRecord {
    table_name: TableName;
    constraint_type: string;
    definition: string;
}

interface PolicyRecord {
    tablename: string;
    policyname: string;
    cmd: string;
}

interface RlsRecord {
    relname: string;
    relrowsecurity: boolean;
}

interface IndexRecord {
    indexname: string;
    indexdef: string;
}

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function assert(condition: boolean, message: string): void {
    if (!condition) {
        failures.push(message);
        console.error(`FAIL ${message}`);
        return;
    }
    console.log(`PASS ${message}`);
}

const failures: string[] = [];

function sorted(values: readonly string[]): string[] {
    return [...values].sort();
}

async function run(): Promise<void> {
    const connectionString = requiredEnv("SUPABASE_REMOTE_DB_URL");
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 10_000,
        statement_timeout: 15_000,
    });

    let transactionStarted = false;
    try {
        await client.connect();
        await client.query("BEGIN READ ONLY");
        transactionStarted = true;

        const { rows: readOnlyRows } = await client.query<{ transaction_read_only: string }>(
            "SHOW transaction_read_only"
        );
        assert(
            readOnlyRows[0]?.transaction_read_only === "on",
            "remote schema checks run in a read-only transaction"
        );

        const tableNames = Object.keys(expectedTables);
        const { rows: columns } = await client.query<ColumnRecord>(
            `select table_name, column_name, data_type, is_nullable
             from information_schema.columns
             where table_schema = 'public' and table_name = any($1::text[])
             order by table_name, ordinal_position`,
            [tableNames]
        );

        for (const [tableName, expected] of Object.entries(expectedTables) as [
            TableName,
            readonly string[],
        ][]) {
            const actual = columns
                .filter((column) => column.table_name === tableName)
                .map((column) => column.column_name);
            assert(
                JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected)),
                `${tableName} has the expected columns${
                    JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected))
                        ? ""
                        : ` (missing: ${sorted(expected.filter((column) => !actual.includes(column))).join(", ") || "none"}; unexpected: ${sorted(actual.filter((column) => !expected.includes(column))).join(", ") || "none"})`
                }`
            );
        }

        const keyColumnExpectations: Array<{
            table: TableName;
            column: string;
            dataType: string;
            nullable: "YES" | "NO";
        }> = [
            { table: "profiles", column: "username", dataType: "text", nullable: "NO" },
            { table: "matches", column: "home_sets", dataType: "smallint", nullable: "YES" },
            { table: "matches", column: "away_sets", dataType: "smallint", nullable: "YES" },
            { table: "rounds", column: "starts_at", dataType: "timestamp with time zone", nullable: "NO" },
            { table: "rounds", column: "ends_at", dataType: "timestamp with time zone", nullable: "NO" },
            { table: "match_player_stats", column: "attack_excellent", dataType: "integer", nullable: "NO" },
            { table: "player_match_scores", column: "score", dataType: "integer", nullable: "NO" },
            { table: "player_round_scores", column: "scoring_version", dataType: "text", nullable: "NO" },
        ];
        for (const expected of keyColumnExpectations) {
            const column = columns.find((item) =>
                item.table_name === expected.table && item.column_name === expected.column
            );
            assert(
                column?.data_type === expected.dataType
                    && column.is_nullable === expected.nullable,
                `${expected.table}.${expected.column} has type ${expected.dataType} and nullable=${expected.nullable}`
            );
        }

        const { rows: rlsRows } = await client.query<RlsRecord>(
            `select c.relname, c.relrowsecurity
             from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = any($1::text[])`,
            [tableNames]
        );
        assert(
            rlsRows.length === tableNames.length
                && rlsRows.every((table) => table.relrowsecurity),
            "RLS is enabled on all 19 application tables"
        );

        const { rows: constraints } = await client.query<ConstraintRecord>(
            `select c.relname as table_name, con.contype as constraint_type,
                    pg_get_constraintdef(con.oid) as definition
             from pg_constraint con
             join pg_class c on c.oid = con.conrelid
             join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = any($1::text[])`,
            [tableNames]
        );
        const hasConstraint = (table: TableName, fragment: string) =>
            constraints.some((constraint) =>
                constraint.table_name === table
                && constraint.definition.toLowerCase().includes(fragment.toLowerCase())
            );
        const checkHasExactValues = (
            table: TableName,
            column: string,
            expectedValues: readonly string[]
        ) => constraints.some((constraint) => {
            if (
                constraint.table_name !== table
                || constraint.constraint_type !== "c"
                || !constraint.definition.toLowerCase().includes(column)
            ) {
                return false;
            }
            const actualValues = Array.from(
                constraint.definition.matchAll(/'([^']+)'/g),
                (match) => match[1]
            );
            return JSON.stringify(sorted(actualValues))
                === JSON.stringify(sorted(expectedValues));
        });
        assert(
            tableNames.every((table) =>
                constraints.some((constraint) =>
                    constraint.table_name === table && constraint.constraint_type === "p"
                )
            ),
            "every application table has a primary key"
        );
        assert(
            hasConstraint("fantasy_teams", "UNIQUE (league_id, user_id)"),
            "a user has at most one fantasy team per league"
        );
        const expectedForeignKeys: ReadonlyArray<readonly [TableName, string]> = [
            ["profiles", "FOREIGN KEY (id) REFERENCES auth.users(id)"],
            ["seasons", "FOREIGN KEY (competition_id) REFERENCES competitions(id)"],
            ["teams", "FOREIGN KEY (competition_id, season_id) REFERENCES seasons(competition_id, id)"],
            ["players", "FOREIGN KEY (competition_id, season_id, team_id) REFERENCES teams(competition_id, season_id, id)"],
            ["rounds", "FOREIGN KEY (competition_id, season_id) REFERENCES seasons(competition_id, id)"],
            ["matches", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["matches", "FOREIGN KEY (competition_id, season_id, home_team_id) REFERENCES teams(competition_id, season_id, id)"],
            ["matches", "FOREIGN KEY (competition_id, season_id, away_team_id) REFERENCES teams(competition_id, season_id, id)"],
            ["match_player_stats", "FOREIGN KEY (competition_id, season_id, match_id) REFERENCES matches(competition_id, season_id, id)"],
            ["match_player_stats", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["match_player_stats", "FOREIGN KEY (competition_id, season_id, team_id) REFERENCES teams(competition_id, season_id, id)"],
            ["player_market_values", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["player_market_values", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["private_leagues", "FOREIGN KEY (competition_id, season_id) REFERENCES seasons(competition_id, id)"],
            ["private_league_members", "FOREIGN KEY (league_id) REFERENCES private_leagues(id)"],
            ["private_league_members", "FOREIGN KEY (user_id) REFERENCES auth.users(id)"],
            ["fantasy_teams", "FOREIGN KEY (league_id, competition_id, season_id) REFERENCES private_leagues(id, competition_id, season_id)"],
            ["fantasy_teams", "FOREIGN KEY (competition_id, season_id) REFERENCES seasons(competition_id, id)"],
            ["fantasy_team_players", "FOREIGN KEY (fantasy_team_id, competition_id, season_id) REFERENCES fantasy_teams(id, competition_id, season_id)"],
            ["fantasy_team_players", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["fantasy_team_players", "FOREIGN KEY (competition_id, season_id, joined_round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["fantasy_team_players", "FOREIGN KEY (competition_id, season_id, left_round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["lineups", "FOREIGN KEY (fantasy_team_id, competition_id, season_id) REFERENCES fantasy_teams(id, competition_id, season_id)"],
            ["lineups", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["lineup_players", "FOREIGN KEY (competition_id, season_id, lineup_id) REFERENCES lineups(competition_id, season_id, id)"],
            ["lineup_players", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["player_match_scores", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["player_match_scores", "FOREIGN KEY (competition_id, season_id, match_id) REFERENCES matches(competition_id, season_id, id)"],
            ["player_match_scores", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["player_round_scores", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["player_round_scores", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["fantasy_scores", "FOREIGN KEY (fantasy_team_id, competition_id, season_id) REFERENCES fantasy_teams(id, competition_id, season_id)"],
            ["fantasy_scores", "FOREIGN KEY (competition_id, season_id, lineup_id) REFERENCES lineups(competition_id, season_id, id)"],
            ["fantasy_scores", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
            ["transactions", "FOREIGN KEY (fantasy_team_id, competition_id, season_id) REFERENCES fantasy_teams(id, competition_id, season_id)"],
            ["transactions", "FOREIGN KEY (competition_id, season_id, player_id) REFERENCES players(competition_id, season_id, id)"],
            ["transactions", "FOREIGN KEY (competition_id, season_id, round_id) REFERENCES rounds(competition_id, season_id, id)"],
        ];
        for (const [table, definition] of expectedForeignKeys) {
            assert(
                hasConstraint(table, definition),
                `${table} has foreign key ${definition}`
            );
        }
        assert(
            hasConstraint("rounds", "CHECK (starts_at <= ends_at)"),
            "round date range cannot end before it starts"
        );
        assert(
            checkHasExactValues(
                "matches",
                "status",
                ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "POSTPONED"]
            ),
            "matches constrain status to the supported values"
        );
        assert(
            checkHasExactValues(
                "players",
                "position",
                ["setter", "opposite", "outside", "middle", "libero", "unknown"]
            ),
            "players constrain position to the normalized domain values"
        );

        const { rows: indexes } = await client.query<IndexRecord>(
            `select indexname, indexdef from pg_indexes
             where schemaname = 'public' and indexname = 'active_player_per_league_idx'`
        );
        assert(
            indexes.length === 1
                && indexes[0].indexdef.toLowerCase().includes("unique")
                && /where\s+\(?is_active\)?/.test(indexes[0].indexdef.toLowerCase()),
            "active ownership of a player is unique within a league"
        );

        const { rows: policies } = await client.query<PolicyRecord>(
            `select tablename, policyname, cmd from pg_policies
             where schemaname = 'public'`
        );
        const requiredPolicies = [
            ["profiles", "users read own profile", "SELECT"],
            ["private_leagues", "members read leagues", "SELECT"],
            ["private_league_members", "members read members", "SELECT"],
            ["fantasy_teams", "members read fantasy teams", "SELECT"],
            ["fantasy_scores", "members read fantasy scores", "SELECT"],
        ];
        for (const [table, policy, command] of requiredPolicies) {
            assert(
                policies.some((item) =>
                    item.tablename === table
                    && item.policyname === policy
                    && item.cmd === command
                ),
                `${table} has the expected ${command.toLowerCase()} policy`
            );
        }
        const mutableFantasyTables = new Set([
            "private_leagues", "private_league_members", "fantasy_teams",
            "fantasy_team_players", "lineups", "lineup_players", "transactions",
        ]);
        assert(
            !policies.some((policy) =>
                mutableFantasyTables.has(policy.tablename)
                && ["INSERT", "UPDATE", "DELETE", "ALL"].includes(policy.cmd)
            ),
            "fantasy tables do not expose direct write policies"
        );

        const rpcFunctions = [
            ["public.create_private_league(uuid,uuid,text,text,uuid)", true],
            ["public.join_private_league(text,uuid)", true],
            ["public.leave_private_league(uuid)", true],
            ["public.transfer_player(uuid,uuid,uuid,text)", true],
            ["public.seed_fantasy_team(uuid,uuid,uuid,uuid,uuid)", false],
        ] as const;
        for (const [signature, executableByAuthenticated] of rpcFunctions) {
            const { rows } = await client.query<{ allowed: boolean }>(
                `select has_function_privilege(
                    'authenticated'::name, $1::text, 'EXECUTE'::text
                 ) as allowed`,
                [signature]
            );
            assert(
                rows[0]?.allowed === executableByAuthenticated,
                `${signature} has the expected authenticated execution grant`
            );
        }

        const { rows: anonRpc } = await client.query<{ allowed: boolean }>(
            `select has_function_privilege(
                'anon'::name,
                'public.create_private_league(uuid,uuid,text,text,uuid)'::text,
                'EXECUTE'::text
             ) as allowed`
        );
        assert(!anonRpc[0]?.allowed, "anonymous users cannot call fantasy RPCs");

        const { rows: profileTrigger } = await client.query<{ exists: boolean }>(
            `select exists (
                select 1 from pg_trigger
                where tgrelid = 'auth.users'::regclass
                  and tgname = 'on_auth_user_created'
                  and not tgisinternal
             ) as exists`
        );
        assert(profileTrigger[0]?.exists === true, "auth.users has the profile creation trigger");

        if (failures.length > 0) {
            throw new Error(`${failures.length} remote schema check(s) failed`);
        }

        await client.query("ROLLBACK");
        transactionStarted = false;
        console.log("Remote Supabase schema validation passed.");
    } finally {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }
        await client.end();
    }
}

run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Remote Supabase schema validation failed: ${message}`);
    process.exitCode = 1;
});
