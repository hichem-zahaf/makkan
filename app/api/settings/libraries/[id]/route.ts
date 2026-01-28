import { NextRequest, NextResponse } from 'next/server';
import { updateLibrary, removeLibrary } from '@/services/settings-service';

/**
 * PATCH /api/settings/libraries/[id]
 * Update a specific library
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateLibrary(params.id, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating library:', error);
    return NextResponse.json(
      { error: 'Failed to update library' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/libraries/[id]
 * Delete a specific library
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await removeLibrary(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting library:', error);
    return NextResponse.json(
      { error: 'Failed to delete library' },
      { status: 500 }
    );
  }
}
