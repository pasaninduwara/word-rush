import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: {
        totalScore: 'desc'
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        totalScore: true,
        gamesPlayed: true,
        gamesWon: true
      },
      take: 100
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      totalScore: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      avgScore: user.gamesPlayed > 0 ? Math.round(user.totalScore / user.gamesPlayed) : 0
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
