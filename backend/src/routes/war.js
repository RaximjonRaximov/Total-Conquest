import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { query, transaction } from '../config/db.js';

const WAR_PREP_DURATION   = 24 * 60 * 60 * 1000; // 24h in ms
const WAR_BATTLE_DURATION = 24 * 60 * 60 * 1000;
const MAX_ATTACKS_PER_MEMBER = 2;

async function getMyWarAlliance(userId) {
    const { rows: [m] } = await query(
        'SELECT alliance_id, role FROM alliance_members WHERE user_id = $1', [userId]
    );
    return m || null;
}

export default async function warRoutes(fastify) {

    // ── Urush holatini yangilash (lazy state machine) ─────────────────────────
    async function _advanceWarState(warId) {
        const { rows: [war] } = await query(
            'SELECT id, state, prep_start, battle_start FROM clan_wars WHERE id = $1',
            [warId]
        );
        if (!war) return;

        const now = new Date().toISOString();
        if (war.state === 'preparation' && war.battle_start && now >= war.battle_start) {
            const battleEnd = new Date(
                new Date(war.battle_start).getTime() + WAR_BATTLE_DURATION
            ).toISOString();
            await query(
                `UPDATE clan_wars SET state = 'battle', battle_start = $1 WHERE id = $2`,
                [now, warId]
            );
        } else if (war.state === 'battle') {
            const battleEnd = new Date(
                new Date(war.battle_start).getTime() + WAR_BATTLE_DURATION
            ).toISOString();
            if (now >= battleEnd) {
                await query(
                    `UPDATE clan_wars SET state = 'ended', ended_at = $1 WHERE id = $2`,
                    [now, warId]
                );
            }
        }
    }

    // ── Aktiv urush holati ────────────────────────────────────────────────────
    fastify.get('/war/me', { preHandler: requireAuth }, async (req, reply) => {
        const membership = await getMyWarAlliance(req.user.id);
        if (!membership) return reply.code(404).send({ error: 'Not in an alliance' });

        const { rows: [war] } = await query(
            `SELECT w.*,
                    a1.name as alliance1_name, a1.tag as alliance1_tag,
                    a2.name as alliance2_name, a2.tag as alliance2_tag
             FROM clan_wars w
             JOIN alliances a1 ON a1.id = w.alliance1_id
             LEFT JOIN alliances a2 ON a2.id = w.alliance2_id
             WHERE (w.alliance1_id = $1 OR w.alliance2_id = $1)
               AND w.state != 'ended'
             ORDER BY w.created_at DESC LIMIT 1`,
            [membership.alliance_id]
        );

        if (!war) return reply.code(404).send({ error: 'No active war' });

        // Lazy state advance
        await _advanceWarState(war.id);

        // Re-fetch after potential state change
        const { rows: [warFresh] } = await query(
            `SELECT w.*, a1.name as alliance1_name, a1.tag as alliance1_tag,
                    a2.name as alliance2_name, a2.tag as alliance2_tag
             FROM clan_wars w
             JOIN alliances a1 ON a1.id = w.alliance1_id
             LEFT JOIN alliances a2 ON a2.id = w.alliance2_id
             WHERE w.id = $1`,
            [war.id]
        );
        const currentWar = warFresh || war;

        // Urush a'zolari
        const { rows: members } = await query(
            `SELECT wm.*, p.display_name, p.trophies, p.th_level
             FROM war_members wm
             JOIN player_profiles p ON p.user_id = wm.user_id
             WHERE wm.war_id = $1
             ORDER BY p.trophies DESC`,
            [currentWar.id]
        );

        // Hujumlar
        const { rows: attacks } = await query(
            `SELECT wa.*,
                    p1.display_name as attacker_name,
                    p2.display_name as defender_name
             FROM war_attacks wa
             JOIN player_profiles p1 ON p1.user_id = wa.attacker_id
             JOIN player_profiles p2 ON p2.user_id = wa.defender_id
             WHERE wa.war_id = $1
             ORDER BY wa.created_at DESC`,
            [currentWar.id]
        );

        return reply.send({ ...currentWar, members, attacks, my_alliance_id: membership.alliance_id });
    });

    // ── Urush boshlash (rahbar) ───────────────────────────────────────────────
    fastify.post('/war/start', { preHandler: requireAuth }, async (req, reply) => {
        const membership = await getMyWarAlliance(req.user.id);
        if (!membership) return reply.code(404).send({ error: 'Not in an alliance' });
        if (!['leader', 'co-leader'].includes(membership.role)) {
            return reply.code(403).send({ error: 'Only leader or co-leader can start war' });
        }

        // Allaqachon aktiv urush?
        const { rows: [existing] } = await query(
            `SELECT id FROM clan_wars
             WHERE (alliance1_id = $1 OR alliance2_id = $1) AND state != 'ended'`,
            [membership.alliance_id]
        );
        if (existing) return reply.code(409).send({ error: 'Already in an active war' });

        // Raqib topish — eng yaqin o'lchamdagi boshqa ittifoq (urushda emaslari)
        const { rows: myMembers } = await query(
            'SELECT COUNT(*) as cnt FROM alliance_members WHERE alliance_id = $1',
            [membership.alliance_id]
        );
        const mySize = myMembers[0]?.cnt || 1;

        const { rows: [opponent] } = await query(
            `SELECT a.id,
                    (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) as member_count
             FROM alliances a
             WHERE a.id != $1
               AND NOT EXISTS (
                   SELECT 1 FROM clan_wars cw
                   WHERE (cw.alliance1_id = a.id OR cw.alliance2_id = a.id)
                     AND cw.state != 'ended'
               )
             ORDER BY ABS((SELECT COUNT(*) FROM alliance_members WHERE alliance_id = a.id) - $2)
             LIMIT 1`,
            [membership.alliance_id, mySize]
        );

        const warId = uuid();
        const now = new Date().toISOString();
        const prepEnd = new Date(Date.now() + WAR_PREP_DURATION).toISOString();

        await transaction(async (client) => {
            await client.query(
                `INSERT INTO clan_wars (id, alliance1_id, alliance2_id, state, prep_start, battle_start)
                 VALUES ($1, $2, $3, 'preparation', $4, $5)`,
                [warId, membership.alliance_id, opponent?.id || null, now, prepEnd]
            );

            // O'z ittifoq a'zolarini qo'shish
            const { rows: myMembersList } = await client.query(
                'SELECT user_id FROM alliance_members WHERE alliance_id = $1',
                [membership.alliance_id]
            );
            for (const m of myMembersList) {
                await client.query(
                    `INSERT INTO war_members (war_id, user_id, alliance_id) VALUES ($1, $2, $3)`,
                    [warId, m.user_id, membership.alliance_id]
                );
            }

            // Raqib a'zolarini qo'shish
            if (opponent) {
                const { rows: oppMembers } = await client.query(
                    'SELECT user_id FROM alliance_members WHERE alliance_id = $1',
                    [opponent.id]
                );
                for (const m of oppMembers) {
                    await client.query(
                        `INSERT INTO war_members (war_id, user_id, alliance_id) VALUES ($1, $2, $3)`,
                        [warId, m.user_id, opponent.id]
                    );
                }
            }
        });

        return reply.code(201).send({ war_id: warId, state: 'preparation' });
    });

    // ── Urush bazasini saqlash ────────────────────────────────────────────────
    fastify.put('/war/base', { preHandler: requireAuth }, async (req, reply) => {
        const { rows: [wm] } = await query(
            `SELECT wm.war_id FROM war_members wm
             JOIN clan_wars cw ON cw.id = wm.war_id
             WHERE wm.user_id = $1 AND cw.state = 'preparation'`,
            [req.user.id]
        );
        if (!wm) return reply.code(404).send({ error: 'No war in preparation phase' });

        await query(
            'UPDATE war_members SET war_base = $1 WHERE war_id = $2 AND user_id = $3',
            [JSON.stringify(req.body), wm.war_id, req.user.id]
        );
        return reply.send({ ok: true });
    });

    // ── Urush a'zosining baza layoutini olish ────────────────────────────────
    fastify.get('/war/member/:userId/base', { preHandler: requireAuth }, async (req, reply) => {
        const membership = await getMyWarAlliance(req.user.id);
        if (!membership) return reply.code(404).send({ error: 'Not in an alliance' });

        const { rows: [war] } = await query(
            `SELECT cw.id, cw.alliance1_id, cw.alliance2_id
             FROM clan_wars cw
             JOIN war_members wm ON wm.war_id = cw.id AND wm.user_id = $1
             WHERE (cw.alliance1_id = $2 OR cw.alliance2_id = $2)
               AND cw.state IN ('battle', 'preparation')
             ORDER BY cw.created_at DESC LIMIT 1`,
            [req.user.id, membership.alliance_id]
        );
        if (!war) return reply.code(404).send({ error: 'No active war' });

        // Defender shu urushda qarama-qarshi tomonda bo'lishi kerak
        const { rows: [defMember] } = await query(
            `SELECT wm.war_base, p.display_name, p.th_level, p.trophies
             FROM war_members wm
             JOIN player_profiles p ON p.user_id = wm.user_id
             WHERE wm.war_id = $1 AND wm.user_id = $2`,
            [war.id, req.params.userId]
        );
        if (!defMember) return reply.code(404).send({ error: 'Defender not in this war' });

        // Faqat qarama-qarshi tomonni ko'rish mumkin (o'z tomonini emas)
        const defAllianceId = defMember.alliance_id;
        const isEnemy = (war.alliance1_id === membership.alliance_id && war.alliance2_id !== membership.alliance_id) ||
                        (war.alliance2_id === membership.alliance_id);

        let warBase = null;
        if (defMember.war_base) {
            try { warBase = JSON.parse(defMember.war_base); } catch {}
        }

        return reply.send({
            user_id: req.params.userId,
            display_name: defMember.display_name,
            th_level: defMember.th_level,
            trophies: defMember.trophies,
            war_base: warBase,
        });
    });

    // ── Urushda hujum ─────────────────────────────────────────────────────────
    fastify.post('/war/attack', { preHandler: requireAuth }, async (req, reply) => {
        const { defender_id, stars, destruction } = req.body;
        if (!defender_id || stars === undefined || destruction === undefined) {
            return reply.code(400).send({ error: 'defender_id, stars, destruction required' });
        }
        if (stars < 0 || stars > 3 || destruction < 0 || destruction > 100) {
            return reply.code(400).send({ error: 'Invalid stars or destruction' });
        }

        const membership = await getMyWarAlliance(req.user.id);
        if (!membership) return reply.code(404).send({ error: 'Not in an alliance' });

        const { rows: [war] } = await query(
            `SELECT cw.id, wm_att.alliance_id as att_alliance, wm_att.attacks_used
             FROM clan_wars cw
             JOIN war_members wm_att ON wm_att.war_id = cw.id AND wm_att.user_id = $1
             WHERE (cw.alliance1_id = $2 OR cw.alliance2_id = $2) AND cw.state = 'battle'`,
            [req.user.id, membership.alliance_id]
        );
        if (!war) return reply.code(404).send({ error: 'No active battle phase' });
        if (war.attacks_used >= MAX_ATTACKS_PER_MEMBER) {
            return reply.code(409).send({ error: 'Attack limit reached' });
        }

        // Defender shu urushda qarama-qarshi tomondami?
        const { rows: [defMember] } = await query(
            `SELECT wm.alliance_id FROM war_members wm
             WHERE wm.war_id = $1 AND wm.user_id = $2`,
            [war.id, defender_id]
        );
        if (!defMember || defMember.alliance_id === war.att_alliance) {
            return reply.code(400).send({ error: 'Invalid defender' });
        }

        const attackId = uuid();
        await transaction(async (client) => {
            await client.query(
                `INSERT INTO war_attacks (id, war_id, attacker_id, defender_id, stars, destruction)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [attackId, war.id, req.user.id, defender_id, stars, destruction]
            );
            await client.query(
                `UPDATE war_members SET attacks_used = attacks_used + 1,
                                        stars_earned = stars_earned + $1
                 WHERE war_id = $2 AND user_id = $3`,
                [stars, war.id, req.user.id]
            );

            // Ittifoq umumiy yulduzlari
            const isAlliance1Attacker = (await client.query(
                'SELECT alliance1_id FROM clan_wars WHERE id = $1', [war.id]
            )).rows[0]?.alliance1_id === membership.alliance_id;

            if (isAlliance1Attacker) {
                await client.query(
                    `UPDATE clan_wars SET alliance1_stars = alliance1_stars + $1 WHERE id = $2`,
                    [stars, war.id]
                );
            } else {
                await client.query(
                    `UPDATE clan_wars SET alliance2_stars = alliance2_stars + $1 WHERE id = $2`,
                    [stars, war.id]
                );
            }
        });

        return reply.send({ ok: true, attack_id: attackId });
    });
}
