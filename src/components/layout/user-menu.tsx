"use client";

import { CaretDownIcon, SignOutIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { avatarUrl } from "@/components/layout/avatar-url";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "@/lib/session";

type UserMenuProps = {
  session: Session;
};

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserMenu({ session }: UserMenuProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fullName = `${session.firstName} ${session.lastName}`;

  async function signOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/v1/sign-out", { method: "POST" });
    } finally {
      // O cabeçalho é renderizado no servidor: o refresh o faz reler o cookie.
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isSigningOut}
        className="group flex h-10 items-center gap-2.5 rounded-full border border-transparent py-1 pr-1 pl-1 text-sm font-medium outline-none transition-colors hover:border-border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 aria-expanded:border-border aria-expanded:bg-muted sm:pr-3"
      >
        <Avatar className="bg-deep text-[11px] font-semibold text-primary-foreground">
          {/* As iniciais ficam por baixo: aparecem enquanto a imagem carrega
              ou se o DiceBear estiver fora do ar. */}
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center rounded-full"
          >
            {initialsOf(session.firstName, session.lastName)}
          </span>
          {!imageFailed && (
            <Image
              src={avatarUrl(session.firstName, session.lastName)}
              alt={fullName}
              width={32}
              height={32}
              unoptimized
              onError={() => setImageFailed(true)}
              className="absolute inset-0 size-full rounded-full object-cover"
            />
          )}
        </Avatar>
        <span className="hidden max-w-40 truncate sm:inline">{fullName}</span>
        {imageFailed && <span className="sr-only sm:hidden">{fullName}</span>}
        <CaretDownIcon
          aria-hidden="true"
          className="hidden size-3.5 text-muted-foreground transition-transform group-aria-expanded:rotate-180 sm:block"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-lg p-1"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {fullName}
          </span>
          <span className="truncate text-sm font-normal text-muted-foreground">
            {session.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0 my-1" />
        <DropdownMenuItem
          onSelect={signOut}
          className="cursor-pointer rounded-md px-3 py-2 text-sm"
        >
          <SignOutIcon aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
