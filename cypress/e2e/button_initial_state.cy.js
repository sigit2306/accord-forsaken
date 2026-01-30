describe('Music mute button', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window()
    .its('__GAME__')
    .as('game');
  });

  // it('starts in unmuted state', () => {
  //   cy.window()
  //     .its('__GAME__.musicButtonState')
  //     .should('eq', 'unmuted');
  // });

  it('starts in unmuted state', function () {
    expect(this.game.musicButtonState).to.eq('unmuted');
  });

  // it('mutes music when toggled', function () {
  //   this.game.toggleMusic();
  //   expect(this.game.musicMuted).to.eq(true);
  // });

  it('mutes music when toggled', function () {
    this.game.toggleMusic();
    expect(this.game.musicButtonState).to.eq('muted');
  });

  it('unmutes music when toggled again', function () {
    this.game.toggleMusic();
    expect(this.game.musicMuted).to.eq(true);

    this.game.toggleMusic();
    expect(this.game.musicButtonState).to.eq('unmuted');
  });

});