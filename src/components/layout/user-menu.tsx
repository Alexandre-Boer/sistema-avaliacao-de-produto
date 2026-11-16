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

const SIGN_OUT_ERROR =
  "Não foi possível sair. Verifique sua conexão e tente de novo.";

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserMenu({ session }: UserMenuProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const fullName = `${session.firstName} ${session.lastName}`;

  async function signOut() {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    setSignOutFailed(false);
    try {
      const response = await fetch("/api/v1/sign-out", { method: "POST" });
      if (!response.ok) {
        throw new Error(`sign-out respondeu ${response.status}`);
      }
      // O cabeçalho é renderizado no servidor: o refresh o faz reler o cookie.
      router.refresh();
    } catch {
      // Rede fora do ar ou resposta de erro: o cookie continua valendo, então
      // a pessoa precisa saber que ainda está logada.
      setSignOutFailed(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    // Durante o sign-out o gatilho fica só "aria-disabled" (e não `disabled`)
    // para continuar recebendo o foco que o menu devolve ao fechar; quem
    // impede a reabertura é este guard.
    if (nextOpen && isSigningOut) {
      return;
    }
    if (nextOpen) {
      setSignOutFailed(false);
    }
    setOpen(nextOpen);
  }

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger
          // O nome vem daqui em qualquer largura; sem isto o leitor de tela
          // somaria o texto visível (só em telas >= sm) ao `alt` do avatar.
          aria-label={fullName}
          aria-disabled={isSigningOut || undefined}
          className="group flex h-10 items-center gap-2.5 rounded-full border border-transparent py-1 pr-1 pl-1 text-sm font-medium outline-none transition-colors hover:border-border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-disabled:opacity-60 aria-expanded:border-border aria-expanded:bg-muted sm:pr-3"
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
                alt=""
                width={32}
                height={32}
                unoptimized
                onError={() => setImageFailed(true)}
                className="absolute inset-0 size-full rounded-full object-cover"
              />
            )}
          </Avatar>
          <span className="hidden max-w-40 truncate sm:inline">{fullName}</span>
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
      {signOutFailed && (
        <p
          role="alert"
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive shadow-md"
        >
          {SIGN_OUT_ERROR}
        </p>
      )}
    </div>
  );
}
