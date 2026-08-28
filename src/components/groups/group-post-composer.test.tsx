/**
 * Comportamento do composer de publicação em grupo (Backoffice → app).
 *
 * Cobre o que o usuário precisa conseguir fazer sem sair do Backoffice:
 * escrever, anexar imagem opcional, publicar por botão ou atalho — e o que NÃO
 * pode acontecer: publicar vazio, Enter enviando no meio da digitação, ou o
 * texto sumir quando a publicação falha.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createPostMutate = vi.fn();
const uploadMutate = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock("@/hooks/use-groups", () => ({
  useCreateGroupPost: () => ({
    mutateAsync: createPostMutate,
    isPending: false,
  }),
  useUploadGroupCover: () => ({
    mutateAsync: uploadMutate,
    isPending: false,
  }),
}));

import { GroupPostComposer } from "./group-post-composer";

const publishButton = () => screen.getByRole("button", { name: "Publicar" });
const textbox = () => screen.getByRole("textbox");

describe("GroupPostComposer", () => {
  beforeEach(() => {
    createPostMutate.mockReset().mockResolvedValue({ id: "post-1" });
    uploadMutate.mockReset().mockResolvedValue({ url: "/uploads/community/a.png" });
    toastError.mockReset();
    toastSuccess.mockReset();
    // jsdom não implementa objectURL — o composer usa para a prévia da imagem.
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("mantém Publicar desabilitado enquanto o texto está vazio ou só com espaços", async () => {
    const user = userEvent.setup();
    render(<GroupPostComposer groupId="group-abc" />);

    expect(publishButton()).toBeDisabled();

    await user.type(textbox(), "   ");
    expect(publishButton()).toBeDisabled();

    await user.type(textbox(), "aviso");
    expect(publishButton()).toBeEnabled();
  });

  it("publica o conteúdo sem espaços nas pontas e limpa o campo", async () => {
    const user = userEvent.setup();
    render(<GroupPostComposer groupId="group-abc" />);

    await user.type(textbox(), "  Reunião amanhã  ");
    await user.click(publishButton());

    await waitFor(() =>
      expect(createPostMutate).toHaveBeenCalledWith({
        content: "Reunião amanhã",
        image_url: null,
      }),
    );
    expect(textbox()).toHaveValue("");
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("Enter quebra linha e Ctrl+Enter publica", async () => {
    const user = userEvent.setup();
    render(<GroupPostComposer groupId="group-abc" />);

    await user.type(textbox(), "linha 1{Enter}linha 2");
    expect(createPostMutate).not.toHaveBeenCalled();
    expect(textbox()).toHaveValue("linha 1\nlinha 2");

    await user.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() =>
      expect(createPostMutate).toHaveBeenCalledWith({
        content: "linha 1\nlinha 2",
        image_url: null,
      }),
    );
  });

  it("sobe a imagem antes do post e usa a url retornada", async () => {
    const user = userEvent.setup();
    const { container } = render(<GroupPostComposer groupId="group-abc" />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(
      input,
      new File(["x"], "banner.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("Prévia da imagem do conteúdo")).toBeInTheDocument();

    await user.type(textbox(), "Com banner");
    await user.click(publishButton());

    await waitFor(() =>
      expect(createPostMutate).toHaveBeenCalledWith({
        content: "Com banner",
        image_url: "/uploads/community/a.png",
      }),
    );
    expect(uploadMutate).toHaveBeenCalledTimes(1);
  });

  it("recusa arquivo fora da whitelist sem anexar", async () => {
    const { container } = render(<GroupPostComposer groupId="group-abc" />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // fireEvent em vez de user.upload: o userEvent aplica o filtro do atributo
    // `accept` e descartaria o arquivo antes do handler. Aqui o alvo é a
    // validação do próprio composer, que cobre arraste e extensão trocada.
    fireEvent.change(input, {
      target: {
        files: [new File(["x"], "documento.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(
      screen.queryByAltText("Prévia da imagem do conteúdo"),
    ).not.toBeInTheDocument();
  });

  it("preserva o texto digitado quando a publicação falha", async () => {
    createPostMutate.mockRejectedValue(new Error("Group not found"));
    const user = userEvent.setup();
    render(<GroupPostComposer groupId="group-abc" />);

    await user.type(textbox(), "Não pode sumir");
    await user.click(publishButton());

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Group not found"),
    );
    expect(textbox()).toHaveValue("Não pode sumir");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("não publica de novo enquanto o texto está vazio após um envio", async () => {
    const user = userEvent.setup();
    render(<GroupPostComposer groupId="group-abc" />);

    await user.type(textbox(), "Único");
    await user.click(publishButton());
    await waitFor(() => expect(textbox()).toHaveValue(""));

    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(createPostMutate).toHaveBeenCalledTimes(1);
  });
});
