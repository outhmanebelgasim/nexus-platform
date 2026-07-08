import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { userService } from "@/services/userService";
import type { User, UserPayload, UserStatus } from "@/types/user";

const userErrorMessages = {
  badRequest: "Please check the user details.",
  conflict: "An account with this email already exists.",
  forbidden: "You do not have permission to perform this action.",
  serverError: "Something went wrong on our side. Please try again in a few moments.",
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setUsers(await userService.findAll());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, userErrorMessages));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await userService.findAll();
        if (!ignore) {
          setUsers(data);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(getApiErrorMessage(loadError, userErrorMessages));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  const createUser = async (payload: UserPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const created = await userService.create(payload);
      setUsers((current) => [created, ...current]);
    } catch (saveError) {
      const message = getApiErrorMessage(saveError, userErrorMessages);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateUser = async (id: number, payload: UserPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await userService.update(id, payload);
      setUsers((current) => current.map((user) => (user.id === id ? updated : user)));
    } catch (saveError) {
      const message = getApiErrorMessage(saveError, userErrorMessages);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateUserStatus = async (id: number, status: UserStatus) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await userService.updateStatus(id, status);
      setUsers((current) => current.map((user) => (user.id === id ? updated : user)));
    } catch (saveError) {
      const message = getApiErrorMessage(saveError, userErrorMessages);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (id: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await userService.remove(id);
      setUsers((current) => current.filter((user) => user.id !== id));
    } catch (deleteError) {
      const message = getApiErrorMessage(deleteError, userErrorMessages);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return { users, isLoading, isSaving, error, loadUsers, createUser, updateUser, updateUserStatus, deleteUser };
}
