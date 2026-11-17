import { Heartbeat } from './heartbeat';

describe('Heartbeat', () => {
  const create = (interval = 1000) => {
    const ping = vi.fn();
    const onDead = vi.fn();

    return { heartbeat: new Heartbeat(interval, { ping, onDead }), ping, onDead };
  };

  it('should ping once after one interval of silence, and report dead after two', async () => {
    const { heartbeat, ping, onDead } = create();
    heartbeat.start();

    await vi.advanceTimersByTimeAsync(999);
    expect(ping).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(501);
    expect(ping).toHaveBeenCalledTimes(1);
    expect(onDead).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(ping).toHaveBeenCalledTimes(1);
    expect(onDead).toHaveBeenCalledExactlyOnceWith(2000);

    heartbeat.stop();
  });

  it('should count from the last message', async () => {
    const { heartbeat, ping, onDead } = create();
    heartbeat.start();

    await vi.advanceTimersByTimeAsync(900);
    heartbeat.touch();
    await vi.advanceTimersByTimeAsync(900);

    expect(ping).not.toHaveBeenCalled();
    expect(onDead).not.toHaveBeenCalled();

    heartbeat.stop();
  });

  it('should ping again for the next silence, once the answer was taken', async () => {
    const { heartbeat, ping } = create();
    heartbeat.start();

    expect(heartbeat.takeAnswer()).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    heartbeat.touch();
    expect(heartbeat.takeAnswer()).toBe(true);
    expect(heartbeat.takeAnswer()).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    expect(ping).toHaveBeenCalledTimes(2);

    heartbeat.stop();
  });

  it('should stop watching on stop(), and start from now on start()', async () => {
    const { heartbeat, ping, onDead } = create();
    heartbeat.start();
    await vi.advanceTimersByTimeAsync(1000);
    heartbeat.stop();

    await vi.advanceTimersByTimeAsync(5000);
    expect(ping).toHaveBeenCalledTimes(1);
    expect(onDead).not.toHaveBeenCalled();

    heartbeat.start();
    heartbeat.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(ping).toHaveBeenCalledTimes(2);

    heartbeat.stop();
  });

  it('should do nothing with an interval of 0', async () => {
    const { heartbeat, ping, onDead } = create(0);
    heartbeat.start();

    await vi.advanceTimersByTimeAsync(60000);

    expect(ping).not.toHaveBeenCalled();
    expect(onDead).not.toHaveBeenCalled();
  });
});
