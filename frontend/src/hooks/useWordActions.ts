import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface WordActionsState {
    renameOpen: boolean;
    deleteOpen: boolean;
    successMessage: string | null;
    openRename: () => void;
    openDelete: () => void;
    closeRename: () => void;
    closeDelete: () => void;
    setSuccess: (message: string) => void;
    clearSuccess: () => void;
    refresh: () => void;
}

/** Centralises the state and helpers shared by any component that can rename or delete a word. */
export function useWordActions(): WordActionsState {
    const queryClient = useQueryClient();
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    return {
        renameOpen,
        deleteOpen,
        successMessage,
        openRename: () => setRenameOpen(true),
        openDelete: () => setDeleteOpen(true),
        closeRename: () => setRenameOpen(false),
        closeDelete: () => setDeleteOpen(false),
        setSuccess: (message) => setSuccessMessage(message),
        clearSuccess: () => setSuccessMessage(null),
        refresh: () => queryClient.invalidateQueries(),
    };
}
